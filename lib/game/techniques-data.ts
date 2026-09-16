// Thư viện công pháp khởi tạo (được upsert vào bảng Technique lúc chạy).
// Mỗi đại cảnh giới có 2 bộ: 1 bộ Vàng (free lĩnh ngộ, nâng bằng Vàng) và
// 1 bộ Linh thạch (lĩnh ngộ tốn Linh thạch, nâng bằng Linh thạch).
// Thêm công pháp mới: thêm 1 phần tử vào đây (hoặc thêm trực tiếp vào DB).

import type { ElementKey } from "./balance";

export interface TechniqueSeed {
  key: string;
  name: string;
  description: string;
  expMultiplier: number;
  unlockRealm: number;
  maxLevel: number;
  element: ElementKey | null;
  coverKey: string;
  rarity: number;
  currency: "GOLD" | "STONE";
  unlockCost: number; // chi phí lĩnh ngộ (theo currency); GOLD thường = 0
  sortOrder: number;
}

export const TECHNIQUE_CATALOG: TechniqueSeed[] = [
  // ---- Phàm Nhân (0) ----
  { key: "dan_khi_quyet", name: "Dẫn Khí Quyết", description: "Công pháp nhập môn, dẫn linh khí trời đất vào cơ thể.", expMultiplier: 1.15, unlockRealm: 0, maxLevel: 10, element: null, coverKey: "azure", rarity: 1, currency: "GOLD", unlockCost: 0, sortOrder: 1 },
  { key: "thanh_tam_quyet", name: "Thanh Tâm Quyết", description: "Tâm pháp tĩnh tâm, gột rửa tạp niệm, tăng tốc hấp thụ linh khí.", expMultiplier: 1.22, unlockRealm: 0, maxLevel: 10, element: "THUY", coverKey: "violet", rarity: 2, currency: "STONE", unlockCost: 50, sortOrder: 2 },

  // ---- Luyện Khí (1) ----
  { key: "tho_nap_cong", name: "Thổ Nạp Công", description: "Điều tức thổ nạp, ổn định căn cơ, tu vi tăng đều.", expMultiplier: 1.18, unlockRealm: 1, maxLevel: 10, element: "THO", coverKey: "earth", rarity: 1, currency: "GOLD", unlockCost: 0, sortOrder: 3 },
  { key: "tu_nguyen_cong", name: "Tụ Nguyên Công", description: "Ngưng tụ linh khí thành nguyên lực nơi đan điền, tăng mạnh tốc độ.", expMultiplier: 1.30, unlockRealm: 1, maxLevel: 10, element: "THUY", coverKey: "violet", rarity: 2, currency: "STONE", unlockCost: 120, sortOrder: 4 },

  // ---- Trúc Cơ (2) ----
  { key: "ngu_hanh_dieu_tuc", name: "Ngũ Hành Điều Tức", description: "Điều hòa ngũ hành, mượn sinh khắc đẩy nhanh tu vi.", expMultiplier: 1.24, unlockRealm: 2, maxLevel: 10, element: null, coverKey: "rainbow", rarity: 2, currency: "GOLD", unlockCost: 0, sortOrder: 5 },
  { key: "huyen_thien_chan_kinh", name: "Huyền Thiên Chân Kinh", description: "Chân kinh thượng cổ, dẫn động thiên địa nguyên khí.", expMultiplier: 1.38, unlockRealm: 2, maxLevel: 12, element: "HOA", coverKey: "gold", rarity: 3, currency: "STONE", unlockCost: 300, sortOrder: 6 },

  // ---- Kim Đan (3) ----
  { key: "kim_cang_quyet", name: "Kim Cang Quyết", description: "Rèn giũa kim đan cứng cáp, nền tảng vững chắc.", expMultiplier: 1.30, unlockRealm: 3, maxLevel: 12, element: "KIM", coverKey: "crimson", rarity: 2, currency: "GOLD", unlockCost: 0, sortOrder: 7 },
  { key: "cuu_chuyen_kim_dan", name: "Cửu Chuyển Kim Đan Quyết", description: "Đại pháp luyện đan cửu chuyển, mỗi tầng nhân bội tốc độ.", expMultiplier: 1.55, unlockRealm: 3, maxLevel: 12, element: "KIM", coverKey: "gold", rarity: 3, currency: "STONE", unlockCost: 600, sortOrder: 8 },

  // ---- Nguyên Anh (4) ----
  { key: "nguyen_anh_luyen_khi", name: "Nguyên Anh Luyện Khí", description: "Nuôi dưỡng nguyên anh, khí tức hùng hậu.", expMultiplier: 1.40, unlockRealm: 4, maxLevel: 12, element: null, coverKey: "azure", rarity: 3, currency: "GOLD", unlockCost: 0, sortOrder: 9 },
  { key: "thai_hu_chan_giai", name: "Thái Hư Chân Giải", description: "Chân giải hư không, tu vi tăng tốc kinh người.", expMultiplier: 1.70, unlockRealm: 4, maxLevel: 15, element: "THUY", coverKey: "rainbow", rarity: 3, currency: "STONE", unlockCost: 1200, sortOrder: 10 },
];
