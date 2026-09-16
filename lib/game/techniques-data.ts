// Thư viện công pháp khởi tạo (được upsert vào bảng Technique lúc chạy).
// Muốn thêm công pháp mới: thêm 1 phần tử vào đây (hoặc thêm trực tiếp vào DB).

import type { ElementKey } from "./balance";

export interface TechniqueSeed {
  key: string;
  name: string;
  description: string;
  expMultiplier: number; // hệ số nhân EXP (lũy thừa theo cấp) khi active
  unlockRealm: number; // đại cảnh giới tối thiểu để lĩnh ngộ
  maxLevel: number;
  element: ElementKey | null;
  coverKey: string; // biến thể ảnh bìa
  rarity: number; // 1 Thường, 2 Hiếm, 3 Siêu hiếm
  sortOrder: number;
}

export const TECHNIQUE_CATALOG: TechniqueSeed[] = [
  {
    key: "dan_khi_quyet",
    name: "Dẫn Khí Quyết",
    description: "Công pháp nhập môn, dẫn linh khí trời đất vào cơ thể, tăng nhẹ tốc độ tu luyện.",
    expMultiplier: 1.15,
    unlockRealm: 0,
    maxLevel: 10,
    element: null,
    coverKey: "azure",
    rarity: 1,
    sortOrder: 1,
  },
  {
    key: "tho_nap_cong",
    name: "Thổ Nạp Công",
    description: "Điều tức thổ nạp, ổn định căn cơ. Tu vi tăng đều, phù hợp người mới.",
    expMultiplier: 1.18,
    unlockRealm: 0,
    maxLevel: 10,
    element: "THO",
    coverKey: "earth",
    rarity: 1,
    sortOrder: 2,
  },
  {
    key: "tu_nguyen_cong",
    name: "Tụ Nguyên Công",
    description: "Ngưng tụ linh khí thành nguyên lực nơi đan điền, tăng mạnh tốc độ hấp thụ.",
    expMultiplier: 1.28,
    unlockRealm: 1,
    maxLevel: 10,
    element: "THUY",
    coverKey: "violet",
    rarity: 2,
    sortOrder: 3,
  },
  {
    key: "ngu_hanh_dieu_tuc",
    name: "Ngũ Hành Điều Tức",
    description: "Điều hòa ngũ hành trong cơ thể, mượn sinh khắc để đẩy nhanh tu vi.",
    expMultiplier: 1.24,
    unlockRealm: 1,
    maxLevel: 10,
    element: null,
    coverKey: "rainbow",
    rarity: 2,
    sortOrder: 4,
  },
  {
    key: "huyen_thien_chan_kinh",
    name: "Huyền Thiên Chân Kinh",
    description: "Chân kinh thượng cổ, dẫn động thiên địa nguyên khí, tốc độ tu luyện phi thường.",
    expMultiplier: 1.38,
    unlockRealm: 2,
    maxLevel: 12,
    element: "HOA",
    coverKey: "gold",
    rarity: 3,
    sortOrder: 5,
  },
  {
    key: "cuu_chuyen_kim_dan",
    name: "Cửu Chuyển Kim Đan Quyết",
    description: "Đại pháp luyện đan cửu chuyển, mỗi tầng nhân bội tốc độ ngưng tụ tu vi.",
    expMultiplier: 1.55,
    unlockRealm: 3,
    maxLevel: 12,
    element: "KIM",
    coverKey: "crimson",
    rarity: 3,
    sortOrder: 6,
  },
];
