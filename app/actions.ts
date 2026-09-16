"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateCharacter } from "@/lib/game/character";
import { runMeditationTick } from "@/lib/game/tick";
import type { CharacterState } from "@/lib/game/types";

// Client gọi định kỳ để đồng bộ EXP server-authoritative (chống hack + chống lệch).
export async function syncTick(): Promise<CharacterState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const character = await getOrCreateCharacter(session.user.id);
  return runMeditationTick(character);
}

// Đổi chế độ: Thiền (MEDITATE) <-> Vượt ải (COMBAT).
// Cộng nốt EXP của chế độ hiện tại trước khi chuyển, rồi đặt lại mốc thời gian.
export async function toggleMode(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");

  const character = await getOrCreateCharacter(session.user.id);
  // Quyết toán tick hiện tại (nếu đang thiền thì cộng EXP dở dang).
  await runMeditationTick(character);

  const next = character.mode === "MEDITATE" ? "COMBAT" : "MEDITATE";
  await prisma.character.update({
    where: { id: character.id },
    data: { mode: next, lastTickAt: new Date() },
  });

  revalidatePath("/");
}
