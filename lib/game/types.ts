import type { ElementKey } from "./balance";

// Công pháp đang sở hữu (dạng gọn để tính expPerCycle ở cả client lẫn server).
export interface TechniqueState {
  key: string;
  name: string;
  expMultiplier: number;
  level: number;
  active: boolean;
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

  // Vòng luyện khí
  expPerCycle: number;
  cycleMs: number;
  cycleProgressMs: number; // đã trôi qua trong vòng hiện tại (0..cycleMs)

  gold: number; // Vàng
  spiritStones: number; // Linh thạch

  // Chỉ số
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

  techniques: TechniqueState[];

  // Kết quả tick gần nhất (để hiện thông báo "tu luyện offline")
  gainedThisTick: number;
  cyclesThisTick: number;
}
