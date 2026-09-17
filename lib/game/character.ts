import { GameMode, Element } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { STARTER_STONES, STARTER_GOLD } from "./balance";

const includeTech = { techniques: { include: { technique: true } } } as const;

// Tăng số này để ép RESET TOÀN BỘ nhân vật về ban đầu (mọi người, một lần).
const RESET_VERSION = 1;

// Lấy nhân vật của người dùng, tạo mới nếu chưa có (lần đầu đăng nhập).
// Tặng linh thạch/vàng khởi đầu một lần; reset toàn bộ khi RESET_VERSION đổi.
export async function getOrCreateCharacter(userId: string) {
  let character = await prisma.character.findUnique({
    where: { userId },
    include: includeTech,
  });

  if (!character) {
    character = await prisma.character.create({
      data: {
        userId,
        spiritStones: BigInt(STARTER_STONES),
        gold: BigInt(STARTER_GOLD),
        starterGranted: true,
        combatReset: true,
        resetVersion: RESET_VERSION,
      },
      include: includeTech,
    });
    return character;
  }

  // RESET TOÀN BỘ (giữ lại tên) khi phiên bản reset thay đổi.
  if (character.resetVersion < RESET_VERSION) {
    await prisma.charTechnique.deleteMany({ where: { characterId: character.id } });
    await prisma.charEquipment.deleteMany({ where: { characterId: character.id } });
    character = await prisma.character.update({
      where: { id: character.id },
      data: {
        realm: 0,
        subLevel: 1,
        exp: BigInt(0),
        gold: BigInt(STARTER_GOLD),
        spiritStones: BigInt(STARTER_STONES),
        element: Element.KIM,
        mode: GameMode.MEDITATE,
        lastTickAt: new Date(),
        statPoints: 0,
        allocHp: 0,
        allocAtk: 0,
        allocDef: 0,
        allocPPower: 0,
        allocMPower: 0,
        allocPRes: 0,
        allocMRes: 0,
        highestStage: 1,
        currentStage: 1,
        stageLocked: false,
        starterGranted: true,
        combatReset: true,
        lastFocusAt: null,
        resetVersion: RESET_VERSION,
      },
      include: includeTech,
    });
    return character;
  }

  if (!character.starterGranted) {
    character = await prisma.character.update({
      where: { id: character.id },
      data: {
        spiritStones: { increment: BigInt(STARTER_STONES) },
        gold: { increment: BigInt(STARTER_GOLD) },
        starterGranted: true,
      },
      include: includeTech,
    });
  }

  if (!character.combatReset) {
    character = await prisma.character.update({
      where: { id: character.id },
      data: { highestStage: 1, currentStage: 1, stageLocked: false, combatReset: true },
      include: includeTech,
    });
  }

  return character;
}

export type CharacterWithTechniques = Awaited<
  ReturnType<typeof getOrCreateCharacter>
>;
