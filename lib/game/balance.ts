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
export const CYCLE_SECONDS = 5;

// EXP gốc mỗi vòng (trước khi nhân cảnh giới + tâm pháp + buff).
export const BASE_EXP_PER_CYCLE = 5;

// Giới hạn thời gian offline được tính (giây). Ví dụ 24h.
export const MAX_OFFLINE_SECONDS = 24 * 60 * 60;

// ---------------------------------------------------------------------------
// CÂY EXP — mỗi đại cảnh giới có 9 tầng.
//   nền(major)          = EXP_BASE × MAJOR_JUMP^major   (mỗi đại cảnh giới ×10)
//   tầng 1..8           = nền × tầng                     (tuyến tính trong cảnh giới)
//   tầng 9 (đột phá)    = nền × 9 × BREAKTHROUGH_MULT    (bức tường đại cảnh giới)
// ---------------------------------------------------------------------------
export const SUB_TIERS = 9;
export const EXP_BASE = 20;
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

// Tên hiển thị: "Trúc Cơ · tầng 3".
export function tierName(major: number, sub: number): string {
  const name = REALMS[Math.min(Math.max(major, 0), MAX_MAJOR)]?.name ?? "Không rõ";
  return `${name} · tầng ${Math.min(sub, SUB_TIERS)}`;
}

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
