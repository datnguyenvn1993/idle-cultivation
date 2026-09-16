import { prisma } from "@/lib/db/prisma";
import { expForTier, isMaxTier, tierName, type ElementKey } from "./balance";
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

function buildState(
  character: CharacterWithTechniques,
  major: number,
  sub: number,
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

// Tick server-authoritative dựa trên lastTickAt.
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
    );
  }

  const techs = toActive(techStates(character));
  const res = applyMeditationByTime(
    character.realm,
    character.subLevel,
    Number(character.exp),
    elapsedMs,
    techs,
  );

  const newLastTick = now - res.leftoverMs;

  if (res.cycles > 0) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        realm: res.newMajor,
        subLevel: res.newSub,
        exp: BigInt(Math.floor(res.newExp)),
        lastTickAt: new Date(newLastTick),
      },
    });
  }

  return buildState(
    character,
    res.newMajor,
    res.newSub,
    Math.floor(res.newExp),
    res.leftoverMs,
    res.gained,
    res.cycles,
  );
}
