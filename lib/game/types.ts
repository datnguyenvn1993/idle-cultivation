import type { ElementKey, StatKey } from "./balance";

// Công pháp đang sở hữu (dạng gọn để tính expPerCycle ở cả client lẫn server).
export interface TechniqueState {
  key: string;
  name: string;
  currency: "GOLD" | "STONE";
  unlockRealm: number;
  level: number;
  active: boolean;
}

// Công pháp hiển thị ở panel (gộp catalog + sở hữu của người chơi).
export interface TechniqueView {
  id: string;
  key: string;
  name: string;
  description: string;
  element: ElementKey | null;
  coverKey: string;
  rarity: number;
  currency: "GOLD" | "STONE"; // nâng cấp / lĩnh ngộ bằng Vàng hay Linh thạch
  unlockRealm: number;
  maxLevel: number;
  unlocked: boolean; // đại cảnh giới đủ để lĩnh ngộ
  owned: boolean; // đã lĩnh ngộ
  learnCost: number; // chi phí lĩnh ngộ (0 = miễn phí)
  level: number; // 0 nếu chưa học
  active: boolean;
  multiplierNow: number; // 1 + bonus hiện tại
  multiplierNext: number; // 1 + bonus cấp +1
  levelUpCost: number; // chi phí lên cấp (theo currency)
  atMaxLevel: boolean;
  needsItem: boolean; // công pháp Free >lv10: cần vật phẩm (rơi từ quái) mới nâng
}

// Trạng thái nhân vật đã "serialize" (BigInt -> number) để truyền client.
export interface CharacterState {
  name: string;
  mode: "MEDITATE" | "COMBAT";
  element: ElementKey;

  realm: number; // đại cảnh giới
  subLevel: number; // tầng 1..9
  tierName: string; // "Trúc Cơ · tầng 3"
  isMax: boolean; // đã đạt tối đa chưa
  exp: number; // tu vi trong tầng hiện tại
  expToNext: number; // exp cần để lên tầng kế tiếp
  readyBreakthrough: boolean; // đầy tầng 9 -> sẵn sàng Độ Kiếp đột phá đại cảnh giới

  // Vòng luyện khí
  expPerCycle: number;
  cycleMs: number;
  cycleProgressMs: number; // đã trôi qua trong vòng hiện tại (0..cycleMs)

  gold: number; // Vàng
  spiritStones: number; // Linh thạch

  // Điểm chỉ số & phân bổ
  statPoints: number;
  alloc: Record<StatKey, number>;

  // Chỉ số hiệu dụng
  hp: number;
  atk: number;
  def: number;
  pPower: number;
  mPower: number;
  pRes: number;
  mRes: number;
  atkSpeed: number;

  highestStage: number;
  currentStage: number;
  stageLocked: boolean;
  maxStage: number; // ải cao nhất đủ sức (mở khóa)
  powerRating: number;
  stage: StageInfo; // thông tin ải đang farm

  techniques: TechniqueState[];

  // Kết quả tick gần nhất (để hiện thông báo "tu luyện offline")
  gainedThisTick: number;
  cyclesThisTick: number;
  goldThisTick: number; // vàng nhận đợt tick (combat)
  offlineThisTick: boolean; // đợt tick vừa rồi là offline (50%)?
}

export interface StageInfo {
  index: number;
  realmName: string;
  element: ElementKey;
  monsterHp: number;
  monsterDps: number;
  monsterAtkType: "PHYS" | "MAGIC"; // quái đánh vật lý hay phép
  monsterPRes: number;
  monsterMRes: number;
  clearTime: number;
  timeLimit: number; // hạn giết (giây) trước khi hết máu
  canSurvive: boolean; // giết kịp trong hạn?
  goldPerSec: number;
  goldReward: number;
  reduction: number; // % giảm sát thương của người chơi trước đòn của quái này
}
