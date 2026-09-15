"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateCharacter } from "@/lib/game/character";

// Đổi chế độ: Thiền (MEDITATE) <-> Vượt ải (COMBAT).
// Ghi lại lastTickAt để Phase 2 tính offline progress từ mốc này.
export async function toggleMode() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");

  const character = await getOrCreateCharacter(session.user.id);
  const next = character.mode === "MEDITATE" ? "COMBAT" : "MEDITATE";

  await prisma.character.update({
    where: { id: character.id },
    data: { mode: next, lastTickAt: new Date() },
  });

  revalidatePath("/");
}
