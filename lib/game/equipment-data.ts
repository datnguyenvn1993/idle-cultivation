// Thư viện TRANG BỊ khởi tạo (dựng sẵn DB). Phase D sẽ dùng: khi clear ải,
// duyệt các trang bị có dropStageMin..Max chứa ải đó -> tung xác suất dropRate.
// Thêm trang bị mới = thêm 1 dòng ở đây (hoặc thêm trực tiếp vào bảng Equipment).

import type { ElementKey, StatKey } from "./balance";

export interface EquipmentSeed {
  key: string;
  name: string;
  slot: "weapon" | "armor" | "helmet" | "accessory" | "artifact";
  rarity: number; // 1 Thường, 2 Hiếm, 3 Siêu hiếm
  realm: number; // cấp bậc đồ theo đại cảnh giới
  element: ElementKey | null;
  statBonus: Partial<Record<StatKey | "atkSpeed", number>>;
  dropStageMin: number; // chỉ rơi từ ải này...
  dropStageMax: number; // ...đến ải này
  dropRate: number; // tỉ lệ rơi mỗi lần clear (0..1)
  sortOrder: number;
}

export const EQUIPMENT_CATALOG: EquipmentSeed[] = [
  // ---- Phàm Nhân / Luyện Khí (realm 0) — ải 1..10 ----
  { key: "so_kiem", name: "Sơ Kiếm", slot: "weapon", rarity: 1, realm: 0, element: "KIM", statBonus: { atk: 8, pPower: 5 }, dropStageMin: 1, dropStageMax: 10, dropRate: 0.05, sortOrder: 1 },
  { key: "linh_giap", name: "Linh Giáp", slot: "armor", rarity: 1, realm: 0, element: null, statBonus: { def: 6, hp: 40, pRes: 4 }, dropStageMin: 1, dropStageMax: 10, dropRate: 0.05, sortOrder: 2 },

  // ---- Trúc Cơ (realm 1) — ải 11..20 ----
  { key: "huyen_thiet_kiem", name: "Huyền Thiết Kiếm", slot: "weapon", rarity: 2, realm: 1, element: "KIM", statBonus: { atk: 20, pPower: 14 }, dropStageMin: 11, dropStageMax: 20, dropRate: 0.03, sortOrder: 3 },
  { key: "thuy_linh_bao", name: "Thủy Linh Bào", slot: "armor", rarity: 2, realm: 1, element: "THUY", statBonus: { def: 14, hp: 120, mRes: 10 }, dropStageMin: 11, dropStageMax: 20, dropRate: 0.03, sortOrder: 4 },

  // ---- Kim Đan (realm 2) — ải 21..30 ----
  { key: "phuong_hoang_vu", name: "Phượng Hoàng Vũ", slot: "accessory", rarity: 3, realm: 2, element: "HOA", statBonus: { mPower: 40, atkSpeed: 0.2 }, dropStageMin: 21, dropStageMax: 30, dropRate: 0.01, sortOrder: 5 },
  { key: "kim_cang_gioi", name: "Kim Cang Giới", slot: "accessory", rarity: 3, realm: 2, element: "KIM", statBonus: { pPower: 35, pRes: 20 }, dropStageMin: 21, dropStageMax: 30, dropRate: 0.01, sortOrder: 6 },
];
