import { prisma } from "@/lib/db/prisma";

// Lấy nhân vật của người dùng, tạo mới nếu chưa có (lần đầu đăng nhập).
export async function getOrCreateCharacter(userId: string) {
  const existing = await prisma.character.findUnique({
    where: { userId },
    include: { techniques: { include: { technique: true } } },
  });
  if (existing) return existing;

  return prisma.character.create({
    data: { userId },
    include: { techniques: { include: { technique: true } } },
  });
}

export type CharacterWithTechniques = Awaited<
  ReturnType<typeof getOrCreateCharacter>
>;
