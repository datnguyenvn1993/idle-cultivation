// Combat PvE — hàm THUẦN (không chạm DB). Neo quái theo sức mạnh kỳ vọng của
// cảnh giới để không bao giờ "quá yếu/quá mạnh".

import {
  REALMS,
  MAX_STAGE,
  STAGES_PER_REALM,
  TARGET_CLEAR_TIME,
  TARGET_SURVIVE_TIME,
  MIN_CLEAR_TIME,
  MAX_DMG_REDUCTION,
  mitigationK,
  stageRealm,
  stageGoldReward,
  type EffectiveStats,
  type ElementKey,
} from "./balance";
import { elementMultiplier } from "./engine";

const ELEMENTS: ElementKey[] = ["KIM", "MOC", "THUY", "HOA", "THO"];

export interface StageSpec {
  index: number;
  realm: number;
  monsterHp: number;
  monsterDps: number;
  monsterPRes: number; // thủ vật lý của quái (giảm công vật lý người chơi)
  monsterMRes: number; // thủ phép của quái (giảm công phép người chơi)
  element: ElementKey;
  goldReward: number;
}

// Ải sinh theo công thức: neo vào statBonus cảnh giới, khó dần trong nội bộ cảnh giới.
export function stageSpec(stage: number): StageSpec {
  const s = Math.max(1, Math.min(stage, MAX_STAGE));
  const realm = stageRealm(s);
  const pos = (s - 1) % STAGES_PER_REALM; // 0..9
  const b = REALMS[realm].statBonus;
  const expDPS = b.pPower + b.mPower;
  const expEHP = b.hp;
  const factor = 0.5 + pos * 0.14; // 0.5 (đầu cảnh giới) .. ~1.76 (cuối)
  return {
    index: s,
    realm,
    monsterHp: Math.round(expDPS * TARGET_CLEAR_TIME * factor),
    monsterDps: Math.max(1, Math.round((expEHP / TARGET_SURVIVE_TIME) * factor)),
    monsterPRes: Math.round(b.pRes * factor),
    monsterMRes: Math.round(b.mRes * factor),
    element: ELEMENTS[s % 5],
    goldReward: stageGoldReward(s),
  };
}

export interface CombatResult {
  dps: number;
  physDps: number;
  magicDps: number;
  elemMult: number;
  reduction: number; // % giảm sát thương nhận vào (0..MAX_DMG_REDUCTION)
  clearTime: number; // giây để hạ 1 quái
  canSurvive: boolean;
  goldPerSec: number;
}

export function simulateStage(
  stats: EffectiveStats,
  playerElement: ElementKey,
  spec: StageSpec,
): CombatResult {
  const K = mitigationK(spec.realm);
  const redP = stats.pRes / (stats.pRes + K);
  const redM = stats.mRes / (stats.mRes + K);
  const reduction = Math.min(MAX_DMG_REDUCTION, (redP + redM) / 2);

  // Công người chơi bị giảm bởi THỦ của quái (đối xứng với việc quái bị giảm bởi thủ người chơi).
  const monRedP = Math.min(MAX_DMG_REDUCTION, spec.monsterPRes / (spec.monsterPRes + K));
  const monRedM = Math.min(MAX_DMG_REDUCTION, spec.monsterMRes / (spec.monsterMRes + K));

  const elemMult = elementMultiplier(playerElement, spec.element);
  const physDps = stats.pPower * stats.atkSpeed * (1 - monRedP); // thể tu vs thủ vật lý quái
  const magicDps = stats.mPower * stats.atkSpeed * elemMult * (1 - monRedM); // pháp tu vs thủ phép quái
  const dps = physDps + magicDps;

  const clearTime = Math.max(MIN_CLEAR_TIME, spec.monsterHp / Math.max(dps, 1));
  const incoming = spec.monsterDps * (1 - reduction);
  const canSurvive = incoming * clearTime < stats.hp;
  const goldPerSec = canSurvive ? spec.goldReward / clearTime : 0;

  return { dps, physDps, magicDps, elemMult, reduction, clearTime, canSurvive, goldPerSec };
}

// Chỉ số "Lực chiến" để hiển thị (không dùng để tính clear).
export function powerRating(stats: EffectiveStats): number {
  const dps = (stats.pPower + stats.mPower) * stats.atkSpeed;
  return Math.round(dps * Math.sqrt(Math.max(1, stats.hp)));
}

// Ải cao nhất người chơi đủ sức sống sót (quét từ 1, có trần MAX_STAGE).
export function maxSurvivableStage(
  stats: EffectiveStats,
  playerElement: ElementKey,
): number {
  let top = 1;
  for (let s = 1; s <= MAX_STAGE; s++) {
    if (simulateStage(stats, playerElement, stageSpec(s)).canSurvive) top = s;
    else break;
  }
  return top;
}
