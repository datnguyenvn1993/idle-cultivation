// Game engine — CÁC HÀM THUẦN (pure). Dùng chung ở server (authoritative) và
// có thể tái sử dụng ở client để hiển thị dự đoán. KHÔNG chạm DB tại đây.

import {
  REALMS,
  BASE_EXP_PER_SEC,
  MAX_OFFLINE_SECONDS,
  OVERCOMES,
  ELEMENT_ADVANTAGE,
  ELEMENT_DISADVANTAGE,
  type ElementKey,
} from "./balance";

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  pPower: number;
  mPower: number;
  pRes: number;
  mRes: number;
  atkSpeed: number;
  element: ElementKey;
}

export interface ActiveTechnique {
  expMultiplier: number;
  level: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// NGŨ HÀNH
// ---------------------------------------------------------------------------
export function elementMultiplier(
  attacker: ElementKey,
  defender: ElementKey,
): number {
  if (OVERCOMES[attacker] === defender) return ELEMENT_ADVANTAGE; // ta khắc địch
  if (OVERCOMES[defender] === attacker) return ELEMENT_DISADVANTAGE; // địch khắc ta
  return 1.0;
}

// ---------------------------------------------------------------------------
// THIỀN (EXP)
// ---------------------------------------------------------------------------

// EXP/giây = base * hệ số cảnh giới * tích các công pháp đang active.
export function expPerSecond(realm: number, techniques: ActiveTechnique[]): number {
  const realmDef = REALMS[Math.min(realm, REALMS.length - 1)];
  const realmRate = realmDef?.expRate ?? 1;
  const techMult = techniques
    .filter((t) => t.active)
    .reduce((acc, t) => acc * Math.pow(t.expMultiplier, t.level), 1);
  return BASE_EXP_PER_SEC * realmRate * techMult;
}

export interface MeditationResult {
  gainedExp: number;
  newExp: number;
  newRealm: number;
  breakthroughs: number;
}

// Cộng EXP trong `seconds` giây và tự động đột phá cảnh giới khi đủ.
export function applyMeditation(
  realm: number,
  exp: number,
  seconds: number,
  techniques: ActiveTechnique[],
): MeditationResult {
  const clamped = Math.max(0, Math.min(seconds, MAX_OFFLINE_SECONDS));
  const rate = expPerSecond(realm, techniques);
  let newExp = exp + rate * clamped;
  let newRealm = realm;
  let breakthroughs = 0;

  // Đột phá liên tiếp nếu EXP vượt ngưỡng.
  while (newRealm < REALMS.length - 1) {
    const need = REALMS[newRealm].expToNext;
    if (!isFinite(need) || newExp < need) break;
    newExp -= need;
    newRealm += 1;
    breakthroughs += 1;
  }

  return {
    gainedExp: rate * clamped,
    newExp,
    newRealm,
    breakthroughs,
  };
}

// ---------------------------------------------------------------------------
// VƯỢT ẢI (Combat) — mô phỏng thời gian clear.
// Vật lý (thể tu) KHÔNG dính ngũ hành; phép thuật dính ngũ hành.
// ---------------------------------------------------------------------------
export interface MonsterSpec {
  hp: number;
  dps: number;
  element: ElementKey;
}

export interface CombatResult {
  effectiveDps: number;
  physDps: number;
  magicDps: number;
  elementMult: number;
  clearTimeSec: number; // thời gian để hạ 1 quái
  canSurvive: boolean;
  goldPerSec: number;
}

export function computeCombat(
  stats: CombatStats,
  monster: MonsterSpec,
  goldReward: number,
): CombatResult {
  const elementMult = elementMultiplier(stats.element, monster.element);

  // Phép: dính ngũ hành, trừ thủ phép của quái.
  const magicRaw = stats.mPower * stats.atkSpeed * elementMult;
  const magicDps = Math.max(0, magicRaw - monster.hp * 0); // (mRes quái xử lý qua def dưới)

  // Vật lý (thể tu): không ngũ hành.
  const physRaw = stats.pPower * stats.atkSpeed;

  // Quái phòng thủ chung ở đây gộp vào def; chi tiết p/m res của quái có thể mở rộng sau.
  const mitigation = 1; // placeholder cho def quái (Phase 4 sẽ tách p/m res quái)
  const effectiveDps = Math.max(1, (magicRaw + physRaw) / mitigation);

  const clearTimeSec = monster.hp / effectiveDps;

  // Sống sót: tổng damage quái gây trong thời gian clear phải nhỏ hơn HP người chơi.
  const damageTaken = monster.dps * clearTimeSec;
  const canSurvive = damageTaken < stats.hp;

  const goldPerSec = canSurvive ? goldReward / clearTimeSec : 0;

  return {
    effectiveDps,
    physDps: physRaw,
    magicDps,
    elementMult,
    clearTimeSec,
    canSurvive,
    goldPerSec,
  };
}
