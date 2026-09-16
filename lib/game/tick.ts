import { prisma } from "@/lib/db/prisma";
import { REALMS, realmName, type ElementKey } from "./balance";
import {
  applyMeditationByTime,
  expPerCycle,
  cycleDurationMs,
  expToNext,
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

function buildState(
  character: CharacterWithTechniques,
  realm: number,
  exp: number,
  cycleProgressMs: number,
  gainedThisTick: number,
  cyclesThisTick: number,
): CharacterState {
  const techs = techStates(character);
  return {
    name: character.name,
    mode: character.mode,
    element: character.element as ElementKey,
    realm,
    realmName: realmName(realm),
    exp,
    expToNext: expToNext(realm),
    expPerCycle: expPerCycle(realm, toActive(techs)),
    cycleMs: cycleDurationMs(1),
    cycleProgressMs,
    gold: Number(character.gold),
    hp: character.hp,
    atk: character.atk,
    def: character.def,
    pPower: character.pPower,
    mPower: character.mPower,
    pRes: character.pRes,
    mRes: character.mRes,
    atkSpeed: character.atkSpeed,
    highestStage: character.highestStage,
    currentStage: character.currentStage,
    techniques: techs,
    gainedThisTick,
    cyclesThisTick,
  };
}

// Tính tick server-authoritative dựa trên lastTickAt.
// - Chế độ MEDITATE: cộng EXP theo số vòng đã hoàn thành, đột phá, giữ tiến trình dư.
// - Chế độ COMBAT: chưa cộng gì (Phase 4), chỉ dời mốc thời gian.
// Trả về CharacterState đã serialize để render/animate ở client.
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
    return buildState(character, character.realm, Number(character.exp), 0, 0, 0);
  }

  const techs = toActive(techStates(character));
  const res = applyMeditationByTime(
    character.realm,
    Number(character.exp),
    elapsedMs,
    techs,
  );

  // Giữ lại phần thời gian dư (chưa đủ 1 vòng) bằng cách lùi lastTickAt.
  const newLastTick = now - res.leftoverMs;

  if (res.cycles > 0) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        exp: BigInt(Math.floor(res.newExp)),
        realm: res.newRealm,
        lastTickAt: new Date(newLastTick),
      },
    });
  }

  return buildState(
    character,
    res.newRealm,
    Math.floor(res.newExp),
    res.leftoverMs,
    res.gained,
    res.cycles,
  );
}
