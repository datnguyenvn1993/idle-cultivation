// Bảng cân bằng số của game. Tách riêng để dễ tinh chỉnh mà không đụng logic.
// Toàn bộ giá trị EXP dùng number ở tầng balance; engine quy đổi sang BigInt khi lưu.

export type ElementKey = "KIM" | "MOC" | "THUY" | "HOA" | "THO";

// ---------------------------------------------------------------------------
// Cảnh giới (realm). realm = index vào mảng này.
// expToNext: EXP cần để đột phá lên cảnh giới kế tiếp.
// statBonus: chỉ số cộng thêm khi ĐẠT cảnh giới này (cộng dồn qua getRealmStats).
// expRate: hệ số nhân EXP/giây khi thiền ở cảnh giới này.
// ---------------------------------------------------------------------------
export interface Realm {
  name: string;
  expToNext: number;
  expRate: number;
  statBonus: {
    hp: number;
    atk: number;
    def: number;
    pPower: number;
    mPower: number;
    pRes: number;
    mRes: number;
  };
}

const s = (
  hp: number,
  atk: number,
  def: number,
  pPower: number,
  mPower: number,
  pRes: number,
  mRes: number,
) => ({ hp, atk, def, pPower, mPower, pRes, mRes });

export const REALMS: Realm[] = [
  { name: "Phàm Nhân",     expToNext: 100,        expRate: 1.0,  statBonus: s(100, 10, 5, 10, 10, 5, 5) },
  { name: "Luyện Khí",     expToNext: 500,        expRate: 1.4,  statBonus: s(150, 18, 10, 18, 18, 9, 9) },
  { name: "Trúc Cơ",       expToNext: 2_500,      expRate: 2.0,  statBonus: s(320, 40, 22, 40, 40, 20, 20) },
  { name: "Kim Đan",       expToNext: 12_000,     expRate: 3.0,  statBonus: s(700, 90, 50, 90, 90, 45, 45) },
  { name: "Nguyên Anh",    expToNext: 60_000,     expRate: 4.5,  statBonus: s(1600, 200, 110, 200, 200, 100, 100) },
  { name: "Hóa Thần",      expToNext: 300_000,    expRate: 7.0,  statBonus: s(3800, 460, 260, 460, 460, 230, 230) },
  { name: "Luyện Hư",      expToNext: 1_500_000,  expRate: 11.0, statBonus: s(9000, 1050, 600, 1050, 1050, 520, 520) },
  { name: "Hợp Thể",       expToNext: 8_000_000,  expRate: 17.0, statBonus: s(21000, 2400, 1400, 2400, 2400, 1200, 1200) },
  { name: "Đại Thừa",      expToNext: 40_000_000, expRate: 26.0, statBonus: s(50000, 5600, 3200, 5600, 5600, 2800, 2800) },
  { name: "Độ Kiếp",       expToNext: Infinity,   expRate: 40.0, statBonus: s(120000, 13000, 7600, 13000, 13000, 6600, 6600) },
];

// ---------------------------------------------------------------------------
// MÔ HÌNH VÒNG LUYỆN KHÍ (cycle)
// Mỗi vòng luyện khí kéo dài CYCLE_SECONDS giây; hoàn thành 1 vòng cộng EXP.
// Đây là "đơn vị" để nhân hệ số tâm pháp / buff / talent về sau.
// ---------------------------------------------------------------------------
export const CYCLE_SECONDS = 10; // 10 giây mỗi chu thiên

// EXP gốc mỗi vòng (trước khi nhân cảnh giới + tâm pháp + buff).
export const BASE_EXP_PER_CYCLE = 5;

// Offline: tích lũy tối đa 8 giờ, và chỉ nhận 50% so với online.
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
export const OFFLINE_RATE = 0.5;
// Khoảng "còn online": tick cách nhau <= mốc này coi như đang chơi (100%).
export const ONLINE_GRACE_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// CÂY EXP — mỗi đại cảnh giới có 9 tầng.
//   nền(major)          = EXP_BASE × MAJOR_JUMP^major   (mỗi đại cảnh giới ×10)
//   tầng 1..8           = nền × tầng                     (tuyến tính trong cảnh giới)
//   tầng 9 (đột phá)    = nền × 9 × BREAKTHROUGH_MULT    (bức tường đại cảnh giới)
// ---------------------------------------------------------------------------
export const SUB_TIERS = 9;
export const EXP_BASE = 40; // x2 so với trước (lên cấp chậm lại)
export const MAJOR_JUMP = 10;
export const BREAKTHROUGH_MULT = 4;
export const MAX_MAJOR = REALMS.length - 1;

// EXP cần để hoàn thành (major, sub) và lên tầng kế tiếp.
export function expForTier(major: number, sub: number): number {
  const m = Math.min(Math.max(major, 0), MAX_MAJOR);
  const majorBase = EXP_BASE * Math.pow(MAJOR_JUMP, m);
  if (sub >= SUB_TIERS) {
    return Math.round(majorBase * SUB_TIERS * BREAKTHROUGH_MULT);
  }
  return Math.round(majorBase * Math.max(1, sub));
}

// Đã đạt tối đa (đại cảnh giới cuối, tầng 9)?
export function isMaxTier(major: number, sub: number): boolean {
  return major >= MAX_MAJOR && sub >= SUB_TIERS;
}

// Chỉ số tổng của tầng (để tính số tầng đã lên -> điểm chỉ số).
export function totalTierIndex(major: number, sub: number): number {
  return major * SUB_TIERS + (sub - 1);
}

// ---------------------------------------------------------------------------
// ĐIỂM CHỈ SỐ — mỗi lần lên tầng nhận STAT_POINTS_PER_TIER điểm.
// ---------------------------------------------------------------------------
export const STAT_POINTS_PER_TIER = 3;
export const STARTER_GOLD = 300;

export type StatKey = "hp" | "atk" | "def" | "pPower" | "mPower" | "pRes" | "mRes";

// Mỗi điểm cộng bao nhiêu vào chỉ số tương ứng.
export const STAT_POINT_GAINS: Record<StatKey, number> = {
  hp: 20,
  atk: 3,
  def: 2,
  pPower: 3,
  mPower: 3,
  pRes: 2,
  mRes: 2,
};

export const STAT_LABELS: Record<StatKey, string> = {
  hp: "Máu",
  atk: "Tấn công",
  def: "Phòng thủ",
  pPower: "Công vật lý",
  mPower: "Công phép",
  pRes: "Thủ vật lý",
  mRes: "Thủ phép",
};

// Chỉ số cho phép phân bổ điểm (đã gộp: bỏ Tấn công & Phòng thủ chung).
export const STAT_KEYS: StatKey[] = ["pPower", "mPower", "pRes", "mRes", "hp"];

// "Tập trung cao độ": mỗi phiên kéo dài giới hạn, sau đó hồi chiêu.
export const FOCUS_DURATION_MS = 30 * 1000;
export const FOCUS_COOLDOWN_MS = 4 * 60 * 1000;

// ---------------------------------------------------------------------------
// VƯỢT ẢI (PvE) — ải sinh theo công thức, neo vào sức mạnh kỳ vọng của cảnh giới.
// ---------------------------------------------------------------------------
export const STAGES_PER_REALM = 10; // mỗi đại cảnh giới có 10 ải
export const MAX_STAGE = (MAX_MAJOR + 1) * STAGES_PER_REALM; // tổng số ải
export const TARGET_CLEAR_TIME = 8; // giây/quái cho người chơi "chuẩn"
export const TARGET_SURVIVE_TIME = 24; // ngưỡng sống sót của người chơi "chuẩn"
export const MIN_CLEAR_TIME = 0.5; // sàn thời gian clear (chống clear tức thì)
export const MONSTER_DIFFICULTY = 3; // hệ số khó: máu quái ×N (chỉnh độ khó tổng)
export const GOLD_BASE = 1; // vàng gốc mỗi ải (rất ít)
export const GOLD_GROWTH = 1.08; // hệ số tăng vàng theo ải (nhẹ)
export const MAX_DMG_REDUCTION = 0.9; // trần giảm sát thương (không bất tử)

// Đại cảnh giới của ải.
export function stageRealm(stage: number): number {
  return Math.min(Math.floor((stage - 1) / STAGES_PER_REALM), MAX_MAJOR);
}

// Hằng số giảm trừ theo cảnh giới ải: res/(res+K). K ~ thủ chuẩn của cảnh giới
// → người chơi "chuẩn" giảm ~50%, res cao hơn thì giảm dần (không đạt 100%).
export function mitigationK(realm: number): number {
  return Math.max(1, REALMS[Math.min(Math.max(realm, 0), MAX_MAJOR)].statBonus.pRes);
}

export function stageGoldReward(stage: number): number {
  return Math.max(1, Math.round(GOLD_BASE * Math.pow(GOLD_GROWTH, stage - 1)));
}

export interface EffectiveStats {
  hp: number;
  atk: number;
  def: number;
  pPower: number;
  mPower: number;
  pRes: number;
  mRes: number;
  atkSpeed: number;
}

// Chỉ số hiệu dụng = nền cảnh giới + điểm phân bổ (sau này + trang bị + kỹ năng).
export function computeStats(
  major: number,
  alloc: Record<StatKey, number>,
): EffectiveStats {
  const b = REALMS[Math.min(Math.max(major, 0), MAX_MAJOR)].statBonus;
  return {
    hp: b.hp + alloc.hp * STAT_POINT_GAINS.hp,
    atk: b.atk + alloc.atk * STAT_POINT_GAINS.atk,
    def: b.def + alloc.def * STAT_POINT_GAINS.def,
    pPower: b.pPower + alloc.pPower * STAT_POINT_GAINS.pPower,
    mPower: b.mPower + alloc.mPower * STAT_POINT_GAINS.mPower,
    pRes: b.pRes + alloc.pRes * STAT_POINT_GAINS.pRes,
    mRes: b.mRes + alloc.mRes * STAT_POINT_GAINS.mRes,
    atkSpeed: 1.0,
  };
}

// Tên hiển thị: "Trúc Cơ · tầng 3".
export function tierName(major: number, sub: number): string {
  const name = REALMS[Math.min(Math.max(major, 0), MAX_MAJOR)]?.name ?? "Không rõ";
  return `${name} · tầng ${Math.min(sub, SUB_TIERS)}`;
}

// ---------------------------------------------------------------------------
// CÔNG PHÁP
// ---------------------------------------------------------------------------

// Linh thạch tặng khởi đầu để người chơi thử nâng cấp công pháp.
export const STARTER_STONES = 500;

// Số công pháp được kích hoạt cùng lúc, tăng theo đại cảnh giới.
export function activeSlots(major: number): number {
  return 1 + Math.min(major, MAX_MAJOR);
}

// Chi phí nâng công pháp từ `level` -> `level + 1`, theo tiền tệ.
// GOLD (Vàng) rẻ hơn theo đơn vị nhưng Vàng kiếm nhiều; STONE (Linh thạch) quý hơn.
export function techniqueLevelCost(
  level: number,
  rarity = 1,
  currency: "GOLD" | "STONE" = "STONE",
): number {
  const base = rarity * level * Math.pow(1.35, level - 1);
  return currency === "GOLD"
    ? Math.round(120 * base)
    : Math.round(40 * base);
}

export const RARITY_LABELS: Record<number, string> = {
  1: "Thường",
  2: "Hiếm",
  3: "Siêu hiếm",
};

// ---------------------------------------------------------------------------
// Ngũ hành tương khắc: OVERCOMES[a] = b nghĩa là a khắc b.
// Hỏa khắc Kim, Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa.
// ---------------------------------------------------------------------------
export const OVERCOMES: Record<ElementKey, ElementKey> = {
  HOA: "KIM",
  KIM: "MOC",
  MOC: "THO",
  THO: "THUY",
  THUY: "HOA",
};

export const ELEMENT_ADVANTAGE = 1.25; // khắc: +25% sát thương phép
export const ELEMENT_DISADVANTAGE = 0.75; // bị khắc: -25%

export const ELEMENT_LABELS: Record<ElementKey, string> = {
  KIM: "Kim",
  MOC: "Mộc",
  THUY: "Thủy",
  HOA: "Hỏa",
  THO: "Thổ",
};

export function realmName(realm: number): string {
  return REALMS[Math.min(realm, REALMS.length - 1)]?.name ?? "Không rõ";
}
