import { prisma } from "@/lib/db/prisma";
import {
  expForTier,
  isMaxTier,
  tierName,
  computeStats,
  totalTierIndex,
  STAT_POINTS_PER_TIER,
  OFFLINE_RATE,
  ONLINE_GRACE_MS,
  MAX_OFFLINE_SECONDS,
  type ElementKey,
  type StatKey,
} from "./balance";
import {
  applyMeditationByTime,
  expPerCycle,
  cycleDurationMs,
  type ActiveTechnique,
} from "./engine";
import type { CharacterState, TechniqueState } from "./types";
import type { CharacterWithTechniques } from "./character";

function techStates(character: CharacterWithTechniques): TechniqueState[] {
  return character.techniques.map((t) => ({
    key: t.technique.key,
    name: t.technique.name,
    expMultiplier: t.technique.expMultiplier,
    level: t.level,
    active: t.active,
  }));
}

function toActive(techs: TechniqueState[]): ActiveTechnique[] {
  return techs.map((t) => ({
    expMultiplier: t.expMultiplier,
    level: t.level,
    active: t.active,
  }));
}

function allocOf(c: CharacterWithTechniques): Record<StatKey, number> {
  return {
    hp: c.allocHp,
    atk: c.allocAtk,
    def: c.allocDef,
    pPower: c.allocPPower,
    mPower: c.allocMPower,
    pRes: c.allocPRes,
    mRes: c.allocMRes,
  };
}

function buildState(
  character: CharacterWithTechniques,
  major: number,
  sub: number,
  exp: number,
  cycleProgressMs: number,
  gainedThisTick: number,
  cyclesThisTick: number,
  offlineThisTick: boolean,
  statPoints: number,
): CharacterState {
  const techs = techStates(character);
  const alloc = allocOf(character);
  const stats = computeStats(major, alloc);
  return {
    name: character.name,
    mode: character.mode,
    element: character.element as ElementKey,
    realm: major,
    subLevel: sub,
    tierName: tierName(major, sub),
    isMax: isMaxTier(major, sub),
    exp,
    expToNext: expForTier(major, sub),
    expPerCycle: expPerCycle(major, toActive(techs)),
    cycleMs: cycleDurationMs(1),
    cycleProgressMs,
    gold: Number(character.gold),
    spiritStones: Number(character.spiritStones),
    statPoints,
    alloc,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    pPower: stats.pPower,
    mPower: stats.mPower,
    pRes: stats.pRes,
    mRes: stats.mRes,
    atkSpeed: stats.atkSpeed,
    highestStage: character.highestStage,
    currentStage: character.currentStage,
    techniques: techs,
    gainedThisTick,
    cyclesThisTick,
    offlineThisTick,
  };
}

// Tick server-authoritative. Online (<=grace) nhận 100%, offline nhận 50% (cap 8h).
// Lên tầng thì cấp điểm chỉ số (STAT_POINTS_PER_TIER mỗi tầng).
export async function runMeditationTick(
  character: CharacterWithTechniques,
): Promise<CharacterState> {
  const now = Date.now();
  const last = character.lastTickAt.getTime();
  const elapsedMs = Math.max(0, now - last);

  if (character.mode !== "MEDITATE") {
    if (elapsedMs > 0) {
      await prisma.character.update({
        where: { id: character.id },
        data: { lastTickAt: new Date(now) },
      });
    }
    return buildState(
      character,
      character.realm,
      character.subLevel,
      Number(character.exp),
      0,
      0,
      0,
      false,
      character.statPoints,
    );
  }

  const offline = elapsedMs > ONLINE_GRACE_MS;
  const effElapsed = offline
    ? Math.min(elapsedMs, MAX_OFFLINE_SECONDS * 1000)
    : elapsedMs;
  const rate = offline ? OFFLINE_RATE : 1;

  const techs = toActive(techStates(character));
  const res = applyMeditationByTime(
    character.realm,
    character.subLevel,
    Number(character.exp),
    effElapsed,
    techs,
    1,
    rate,
  );

  const newLastTick = now - res.leftoverMs;

  // Điểm chỉ số theo số tầng đã lên.
  const tiersGained =
    totalTierIndex(res.newMajor, res.newSub) -
    totalTierIndex(character.realm, character.subLevel);
  const pointsGained = Math.max(0, tiersGained) * STAT_POINTS_PER_TIER;
  const newStatPoints = character.statPoints + pointsGained;

  if (res.cycles > 0) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        realm: res.newMajor,
        subLevel: res.newSub,
        exp: BigInt(Math.floor(res.newExp)),
        lastTickAt: new Date(newLastTick),
        statPoints: newStatPoints,
      },
    });
  }

  return buildState(
    character,
    res.newMajor,
    res.newSub,
    Math.floor(res.newExp),
    res.leftoverMs,
    Math.floor(res.gained),
    res.cycles,
    offline && res.cycles > 0,
    newStatPoints,
  );
}

// "Tập trung cao độ": thưởng ngay N vòng chu thiên (100%), không đụng đồng hồ vòng.
export async function grantFocusCycles(
  character: CharacterWithTechniques,
  n = 1,
): Promise<CharacterState> {
  // Quyết toán thời gian trôi qua trước (để không mất tiến trình).
  const settled = await runMeditationTick(character);
  if (settled.mode !== "MEDITATE" || settled.isMax) return settled;

  const techs = toActive(techStates(character));
  const perCycle = expPerCycle(settled.realm, techs);

  let major = settled.realm;
  let sub = settled.subLevel;
  let exp = settled.exp;
  for (let i = 0; i < n; i++) {
    if (isMaxTier(major, sub)) break;
    exp += perCycle;
    while (!isMaxTier(major, sub)) {
      const need = expForTier(major, sub);
      if (exp < need) break;
      exp -= need;
      if (sub < 9) sub += 1;
      else {
        major += 1;
        sub = 1;
      }
    }
  }

  const tiersGained =
    totalTierIndex(major, sub) - totalTierIndex(settled.realm, settled.subLevel);
  const pointsGained = Math.max(0, tiersGained) * STAT_POINTS_PER_TIER;
  const newStatPoints = settled.statPoints + pointsGained;

  await prisma.character.update({
    where: { id: character.id },
    data: {
      realm: major,
      subLevel: sub,
      exp: BigInt(Math.floor(exp)),
      statPoints: newStatPoints,
      lastFocusAt: new Date(),
    },
  });

  return {
    ...settled,
    realm: major,
    subLevel: sub,
    tierName: tierName(major, sub),
    isMax: isMaxTier(major, sub),
    exp: Math.floor(exp),
    expToNext: expForTier(major, sub),
    statPoints: newStatPoints,
    gainedThisTick: Math.floor(perCycle * n),
    cyclesThisTick: n,
    offlineThisTick: false,
  };
}
