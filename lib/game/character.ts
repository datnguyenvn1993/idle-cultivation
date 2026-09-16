import { prisma } from "@/lib/db/prisma";
import { STARTER_STONES, STARTER_GOLD } from "./balance";

const includeTech = { techniques: { include: { technique: true } } } as const;

// Lấy nhân vật của người dùng, tạo mới nếu chưa có (lần đầu đăng nhập).
// Tặng linh thạch khởi đầu một lần (starterGranted).
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

  return character;
}

export type CharacterWithTechniques = Awaited<
  ReturnType<typeof getOrCreateCharacter>
>;
