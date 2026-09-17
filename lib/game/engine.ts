// Game engine — CÁC HÀM THUẦN (pure). Dùng chung ở server (authoritative) và
// có thể tái sử dụng ở client để hiển thị dự đoán. KHÔNG chạm DB tại đây.

import {
  REALMS,
  BASE_EXP_PER_CYCLE,
  CYCLE_SECONDS,
  SUB_TIERS,
  MAX_MAJOR,
  expForTier,
  isMaxTier,
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
  bonus: number; // bonus EXP dạng thập phân (0.05 = +5%), tính sẵn từ balance.techniqueBonus
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
  const bonus = techniques
    .filter((t) => t.active)
    .reduce((acc, t) => acc + t.bonus, 0);
  return Math.max(1, Math.round(BASE_EXP_PER_CYCLE * realmRate * (1 + bonus)));
}

// Thời gian 1 vòng (ms). speedMult > 1 => vòng ngắn hơn (buff tốc độ tu luyện).
export function cycleDurationMs(speedMult = 1): number {
  return Math.max(200, Math.round((CYCLE_SECONDS * 1000) / speedMult));
}

export interface MeditationResult {
  newMajor: number; // đại cảnh giới mới
  newSub: number; // tầng mới (1..9)
  newExp: number; // tu vi còn lại trong tầng hiện tại
  gained: number; // tổng exp nhận trong đợt tick này
  cycles: number; // số vòng đã hoàn thành
  leftoverMs: number; // thời gian dư chưa đủ 1 vòng (để giữ tiến trình)
  cycleMs: number;
}

// Cộng EXP theo số vòng hoàn thành trong `elapsedMs` (dùng chung offline + online).
// Tự lên tầng / đột phá đại cảnh giới; expPerCycle tính lại theo đại cảnh giới hiện tại.
export function applyMeditationByTime(
  major: number,
  sub: number,
  exp: number,
  elapsedMs: number,
  techniques: ActiveTechnique[],
  speedMult = 1,
  expRate = 1, // 1 = online (100%), 0.5 = offline
): MeditationResult {
  const cycleMs = cycleDurationMs(speedMult);
  const clamped = Math.max(0, elapsedMs);
  const cycles = Math.floor(clamped / cycleMs);
  const leftoverMs = clamped - cycles * cycleMs;

  let nm = major;
  let ns = sub;
  let ne = exp;
  let gained = 0;

  for (let i = 0; i < cycles; i++) {
    if (isMaxTier(nm, ns)) break; // đã tối đa
    // Chờ Độ Kiếp: đầy tầng 9 (chưa phải cảnh giới cuối) -> ngừng, không tự đột phá.
    if (ns >= SUB_TIERS && ne >= expForTier(nm, ns)) break;
    const pc = expPerCycle(nm, techniques) * expRate;
    ne += pc;
    gained += pc;
    // Chỉ tự lên TIỂU tầng (1->9). Đột phá ĐẠI cảnh giới phải Độ Kiếp thủ công.
    while (ns < SUB_TIERS) {
      const need = expForTier(nm, ns);
      if (ne < need) break;
      ne -= need;
      ns += 1;
    }
  }

  // Cap EXP khi đầy tầng 9 (chờ Độ Kiếp) hoặc đã tối đa.
  if (ns >= SUB_TIERS) {
    const cap = expForTier(nm, ns);
    if (ne > cap) ne = cap;
  }
  if (nm > MAX_MAJOR) nm = MAX_MAJOR;

  return { newMajor: nm, newSub: ns, newExp: ne, gained, cycles, leftoverMs, cycleMs };
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
