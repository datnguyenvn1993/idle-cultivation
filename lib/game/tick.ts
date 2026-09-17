import { prisma } from "@/lib/db/prisma";
import {
  expForTier,
  isMaxTier,
  tierName,
  realmName,
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
import {
  simulateStage,
  stageSpec,
  powerRating,
  maxSurvivableStage,
} from "./combat";
import type { CharacterState, StageInfo, TechniqueState } from "./types";
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
  goldThisTick = 0,
): CharacterState {
  const techs = techStates(character);
  const alloc = allocOf(character);
  const stats = computeStats(major, alloc);
  const element = character.element as ElementKey;

  const maxStage = maxSurvivableStage(stats, element);
  const curStage = Math.max(1, Math.min(character.currentStage, maxStage));
  const spec = stageSpec(curStage);
  const sim = simulateStage(stats, element, spec);
  const stage: StageInfo = {
    index: curStage,
    realmName: realmName(spec.realm),
    element: spec.element,
    monsterHp: spec.monsterHp,
    monsterDps: spec.monsterDps,
    clearTime: sim.clearTime,
    canSurvive: sim.canSurvive,
    goldPerSec: sim.goldPerSec,
    goldReward: spec.goldReward,
    reduction: sim.reduction,
  };

  return {
    name: character.name,
    mode: character.mode,
    element,
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
    highestStage: Math.max(character.highestStage, maxStage),
    currentStage: curStage,
    stageLocked: character.stageLocked,
    maxStage,
    powerRating: powerRating(stats),
    stage,
    techniques: techs,
    gainedThisTick,
    cyclesThisTick,
    goldThisTick,
    offlineThisTick,
  };
}

// Dispatcher theo chế độ.
export async function runTick(
  character: CharacterWithTechniques,
): Promise<CharacterState> {
  return character.mode === "COMBAT"
    ? runCombatTick(character)
    : runMeditationTick(character);
}

// ---- THIỀN ----
export async function runMeditationTick(
  character: CharacterWithTechniques,
): Promise<CharacterState> {
  const now = Date.now();
  const last = character.lastTickAt.getTime();
  const elapsedMs = Math.max(0, now - last);

  if (character.mode !== "MEDITATE") {
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
  const tiersGained =
    totalTierIndex(res.newMajor, res.newSub) -
    totalTierIndex(character.realm, character.subLevel);
  const newStatPoints = character.statPoints + Math.max(0, tiersGained) * STAT_POINTS_PER_TIER;

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
    character.realm = res.newMajor;
    character.subLevel = res.newSub;
    character.exp = BigInt(Math.floor(res.newExp));
    character.statPoints = newStatPoints;
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

// ---- VƯỢT ẢI ----
export async function runCombatTick(
  character: CharacterWithTechniques,
): Promise<CharacterState> {
  const now = Date.now();
  const last = character.lastTickAt.getTime();
  const elapsedMs = Math.max(0, now - last);

  const alloc = allocOf(character);
  const stats = computeStats(character.realm, alloc);
  const element = character.element as ElementKey;

  const offline = elapsedMs > ONLINE_GRACE_MS;
  const effElapsed = offline
    ? Math.min(elapsedMs, MAX_OFFLINE_SECONDS * 1000)
    : elapsedMs;
  const rate = offline ? OFFLINE_RATE : 1;
  const sec = effElapsed / 1000;

  const top = maxSurvivableStage(stats, element);
  const cur = character.stageLocked
    ? Math.max(1, Math.min(character.currentStage, top))
    : top;

  const spec = stageSpec(cur);
  const sim = simulateStage(stats, element, spec);

  let goldGained = 0;
  let leftoverMs = effElapsed;
  if (sim.canSurvive && sec > 0) {
    const clears = Math.floor(sec / sim.clearTime);
    goldGained = Math.floor(clears * spec.goldReward * rate);
    leftoverMs = effElapsed - clears * sim.clearTime * 1000;
  }
  const newGold = Number(character.gold) + goldGained;
  const newLast = sim.canSurvive ? now - Math.max(0, leftoverMs) : now;

  await prisma.character.update({
    where: { id: character.id },
    data: {
      gold: BigInt(newGold),
      highestStage: Math.max(character.highestStage, top),
      currentStage: cur,
      lastTickAt: new Date(newLast),
    },
  });
  character.gold = BigInt(newGold);
  character.highestStage = Math.max(character.highestStage, top);
  character.currentStage = cur;

  return buildState(
    character,
    character.realm,
    character.subLevel,
    Number(character.exp),
    0,
    0,
    0,
    offline && goldGained > 0,
    character.statPoints,
    goldGained,
  );
}

// "Tập trung cao độ": thưởng ngay N chu thiên (100%), không đụng đồng hồ.
export async function grantFocusCycles(
  character: CharacterWithTechniques,
  n = 1,
): Promise<CharacterState> {
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
  const newStatPoints = settled.statPoints + Math.max(0, tiersGained) * STAT_POINTS_PER_TIER;

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
