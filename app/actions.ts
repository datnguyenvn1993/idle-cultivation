"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateCharacter } from "@/lib/game/character";
import { runMeditationTick } from "@/lib/game/tick";
import { activeSlots, techniqueLevelCost } from "@/lib/game/balance";
import type { CharacterState } from "@/lib/game/types";

type ActionResult = { ok: boolean; error?: string };

async function requireCharacter() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return getOrCreateCharacter(session.user.id);
}

// Client gọi định kỳ để đồng bộ EXP server-authoritative.
export async function syncTick(): Promise<CharacterState> {
  const character = await requireCharacter();
  return runMeditationTick(character);
}

// Đổi chế độ: Thiền <-> Vượt ải. Quyết toán EXP trước khi chuyển.
export async function toggleMode(): Promise<void> {
  const character = await requireCharacter();
  await runMeditationTick(character);
  const next = character.mode === "MEDITATE" ? "COMBAT" : "MEDITATE";
  await prisma.character.update({
    where: { id: character.id },
    data: { mode: next, lastTickAt: new Date() },
  });
  revalidatePath("/");
}

// Lĩnh ngộ công pháp (miễn phí khi đủ cảnh giới).
export async function learnTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runMeditationTick(character); // quyết toán trước khi đổi
  const tech = await prisma.technique.findUnique({ where: { id: techniqueId } });
  if (!tech) return { ok: false, error: "Không tìm thấy công pháp" };
  if (state.realm < tech.unlockRealm)
    return { ok: false, error: "Chưa đủ cảnh giới để lĩnh ngộ" };

  await prisma.charTechnique.upsert({
    where: { characterId_techniqueId: { characterId: character.id, techniqueId } },
    create: { characterId: character.id, techniqueId, level: 1, active: false },
    update: {},
  });
  revalidatePath("/");
  return { ok: true };
}

// Kích hoạt / tắt công pháp (giới hạn số ô theo cảnh giới).
export async function toggleTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runMeditationTick(character);

  const ct = await prisma.charTechnique.findUnique({
    where: { characterId_techniqueId: { characterId: character.id, techniqueId } },
  });
  if (!ct) return { ok: false, error: "Chưa lĩnh ngộ công pháp này" };

  if (!ct.active) {
    const activeCount = await prisma.charTechnique.count({
      where: { characterId: character.id, active: true },
    });
    if (activeCount >= activeSlots(state.realm))
      return {
        ok: false,
        error: `Hết ô kích hoạt (${activeSlots(state.realm)}). Lên cảnh giới để mở thêm.`,
      };
  }

  await prisma.charTechnique.update({
    where: { id: ct.id },
    data: { active: !ct.active },
  });
  revalidatePath("/");
  return { ok: true };
}

// Nâng cấp công pháp bằng linh thạch.
export async function levelTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  await runMeditationTick(character);

  const [ct, tech, fresh] = await Promise.all([
    prisma.charTechnique.findUnique({
      where: { characterId_techniqueId: { characterId: character.id, techniqueId } },
    }),
    prisma.technique.findUnique({ where: { id: techniqueId } }),
    prisma.character.findUnique({
      where: { id: character.id },
      select: { spiritStones: true },
    }),
  ]);
  if (!ct || !tech || !fresh) return { ok: false, error: "Chưa lĩnh ngộ công pháp này" };
  if (ct.level >= tech.maxLevel) return { ok: false, error: "Đã đạt cấp tối đa" };

  const cost = techniqueLevelCost(ct.level + 1, tech.rarity);
  if (Number(fresh.spiritStones) < cost)
    return { ok: false, error: `Không đủ linh thạch (cần ${cost.toLocaleString()})` };

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { spiritStones: { decrement: BigInt(cost) } },
    }),
    prisma.charTechnique.update({
      where: { id: ct.id },
      data: { level: { increment: 1 } },
    }),
  ]);
  revalidatePath("/");
  return { ok: true };
}
