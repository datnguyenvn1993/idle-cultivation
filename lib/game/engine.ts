// Game engine — CÁC HÀM THUẦN (pure). Dùng chung ở server (authoritative) và
// có thể tái sử dụng ở client để hiển thị dự đoán. KHÔNG chạm DB tại đây.

import {
  REALMS,
  BASE_EXP_PER_CYCLE,
  CYCLE_SECONDS,
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
// THIỀN (EXP) — mô hình VÒNG LUYỆN KHÍ (cycle)
// ---------------------------------------------------------------------------

// EXP mỗi vòng = base * hệ số cảnh giới * tích các tâm pháp đang active.
// Đây là điểm móc để nhân buff/talent về sau.
export function expPerCycle(realm: number, techniques: ActiveTechnique[]): number {
  const realmDef = REALMS[Math.min(realm, REALMS.length - 1)];
  const realmRate = realmDef?.expRate ?? 1;
  const techMult = techniques
    .filter((t) => t.active)
    .reduce((acc, t) => acc * Math.pow(t.expMultiplier, t.level), 1);
  return Math.max(1, Math.round(BASE_EXP_PER_CYCLE * realmRate * techMult));
}

// Thời gian 1 vòng (ms). speedMult > 1 => vòng ngắn hơn (buff tốc độ tu luyện).
export function cycleDurationMs(speedMult = 1): number {
  return Math.max(200, Math.round((CYCLE_SECONDS * 1000) / speedMult));
}

// Ngưỡng đột phá của cảnh giới hiện tại.
export function expToNext(realm: number): number {
  return REALMS[Math.min(realm, REALMS.length - 1)]?.expToNext ?? Infinity;
}

export interface MeditationResult {
  newRealm: number;
  newExp: number; // exp còn lại trong cảnh giới mới
  gained: number; // tổng exp nhận trong đợt tick này
  cycles: number; // số vòng đã hoàn thành
  leftoverMs: number; // thời gian dư chưa đủ 1 vòng (để giữ tiến trình)
  cycleMs: number;
}

// Cộng EXP theo số vòng hoàn thành trong `elapsedMs` (dùng chung offline + online).
// Tự đột phá cảnh giới; tính lại expPerCycle sau mỗi lần đột phá (rate đổi theo cảnh giới).
export function applyMeditationByTime(
  realm: number,
  exp: number,
  elapsedMs: number,
  techniques: ActiveTechnique[],
  speedMult = 1,
): MeditationResult {
  const cycleMs = cycleDurationMs(speedMult);
  const clamped = Math.max(0, Math.min(elapsedMs, MAX_OFFLINE_SECONDS * 1000));
  const cycles = Math.floor(clamped / cycleMs);
  const leftoverMs = clamped - cycles * cycleMs;

  let newExp = exp;
  let newRealm = realm;
  let gained = 0;

  for (let i = 0; i < cycles; i++) {
    const pc = expPerCycle(newRealm, techniques);
    newExp += pc;
    gained += pc;
    // đột phá liên tiếp nếu đủ
    while (newRealm < REALMS.length - 1) {
      const need = REALMS[newRealm].expToNext;
      if (!isFinite(need) || newExp < need) break;
      newExp -= need;
      newRealm += 1;
    }
  }

  return { newRealm, newExp, gained, cycles, leftoverMs, cycleMs };
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
