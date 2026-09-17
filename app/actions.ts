"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateCharacter } from "@/lib/game/character";
import { runTick, grantFocusCycles } from "@/lib/game/tick";
import {
  activeSlots,
  techniqueLevelCost,
  STAT_KEYS,
  STAT_POINTS_PER_TIER,
  FREE_MAX_GOLD_LEVEL,
  type StatKey,
} from "@/lib/game/balance";
import type { CharacterState } from "@/lib/game/types";

type ActionResult = { ok: boolean; error?: string };

async function requireCharacter() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  return getOrCreateCharacter(session.user.id);
}

function allocData(stat: StatKey, amount: number): Prisma.CharacterUpdateInput {
  const inc = { increment: amount };
  const dec = { decrement: amount };
  switch (stat) {
    case "hp": return { statPoints: dec, allocHp: inc };
    case "atk": return { statPoints: dec, allocAtk: inc };
    case "def": return { statPoints: dec, allocDef: inc };
    case "pPower": return { statPoints: dec, allocPPower: inc };
    case "mPower": return { statPoints: dec, allocMPower: inc };
    case "pRes": return { statPoints: dec, allocPRes: inc };
    case "mRes": return { statPoints: dec, allocMRes: inc };
  }
}

export async function syncTick(): Promise<CharacterState> {
  const character = await requireCharacter();
  return runTick(character);
}

export async function toggleMode(): Promise<void> {
  const character = await requireCharacter();
  await runTick(character);
  const next = character.mode === "MEDITATE" ? "COMBAT" : "MEDITATE";
  await prisma.character.update({
    where: { id: character.id },
    data: { mode: next, lastTickAt: new Date() },
  });
  revalidatePath("/");
}

// Lĩnh ngộ công pháp. Bộ Vàng free; bộ Linh thạch tốn unlockCost.
export async function learnTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runTick(character);
  const tech = await prisma.technique.findUnique({ where: { id: techniqueId } });
  if (!tech) return { ok: false, error: "Không tìm thấy công pháp" };
  if (state.realm < tech.unlockRealm)
    return { ok: false, error: "Chưa đủ cảnh giới để lĩnh ngộ" };

  const existing = await prisma.charTechnique.findUnique({
    where: { characterId_techniqueId: { characterId: character.id, techniqueId } },
  });
  if (existing) return { ok: true };

  const cost = tech.currency === "GOLD" ? 0 : tech.unlockCost;
  if (cost > 0 && Number(character.spiritStones) < cost)
    return { ok: false, error: `Không đủ linh thạch (cần ${cost.toLocaleString()})` };

  await prisma.$transaction([
    ...(cost > 0
      ? [
          prisma.character.update({
            where: { id: character.id },
            data: { spiritStones: { decrement: BigInt(cost) } },
          }),
        ]
      : []),
    prisma.charTechnique.create({
      data: { characterId: character.id, techniqueId, level: 1, active: false },
    }),
  ]);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runTick(character);

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

// Nâng cấp công pháp bằng đúng tiền tệ của nó (Vàng hoặc Linh thạch).
export async function levelTechnique(techniqueId: string): Promise<ActionResult> {
  const character = await requireCharacter();
  await runTick(character);

  const [ct, tech, fresh] = await Promise.all([
    prisma.charTechnique.findUnique({
      where: { characterId_techniqueId: { characterId: character.id, techniqueId } },
    }),
    prisma.technique.findUnique({ where: { id: techniqueId } }),
    prisma.character.findUnique({
      where: { id: character.id },
      select: { gold: true, spiritStones: true },
    }),
  ]);
  if (!ct || !tech || !fresh) return { ok: false, error: "Chưa lĩnh ngộ công pháp này" };
  if (ct.level >= tech.maxLevel) return { ok: false, error: "Đã đạt cấp tối đa" };

  const currency = tech.currency === "GOLD" ? "GOLD" : "STONE";
  if (currency === "GOLD" && ct.level >= FREE_MAX_GOLD_LEVEL)
    return {
      ok: false,
      error: "Công pháp Free trên cấp 10 cần vật phẩm (rơi từ quái) — sắp có ở Phase D",
    };
  const cost = techniqueLevelCost(ct.level + 1, tech.rarity, currency);
  const have = currency === "GOLD" ? Number(fresh.gold) : Number(fresh.spiritStones);
  if (have < cost)
    return {
      ok: false,
      error: `Không đủ ${currency === "GOLD" ? "vàng" : "linh thạch"} (cần ${cost.toLocaleString()})`,
    };

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data:
        currency === "GOLD"
          ? { gold: { decrement: BigInt(cost) } }
          : { spiritStones: { decrement: BigInt(cost) } },
    }),
    prisma.charTechnique.update({
      where: { id: ct.id },
      data: { level: { increment: 1 } },
    }),
  ]);
  revalidatePath("/");
  return { ok: true };
}

// Phân bổ `amount` điểm chỉ số một lần (tối ưu, 1 lần gọi).
export async function allocateStat(stat: string, amount = 1): Promise<ActionResult> {
  const character = await requireCharacter();
  if (!STAT_KEYS.includes(stat as StatKey))
    return { ok: false, error: "Chỉ số không hợp lệ" };
  if (character.statPoints <= 0) return { ok: false, error: "Hết điểm chỉ số" };

  const use = Math.min(Math.max(1, Math.floor(amount)), character.statPoints);
  await prisma.character.update({
    where: { id: character.id },
    data: allocData(stat as StatKey, use),
  });
  revalidatePath("/");
  return { ok: true };
}

// Độ Kiếp: đột phá ĐẠI cảnh giới khi đã đầy tầng 9.
export async function breakthrough(): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runTick(character); // quyết toán trước
  if (!state.readyBreakthrough)
    return { ok: false, error: "Chưa đủ tu vi để độ kiếp" };

  await prisma.character.update({
    where: { id: character.id },
    data: {
      realm: state.realm + 1,
      subLevel: 1,
      exp: BigInt(0),
      statPoints: { increment: STAT_POINTS_PER_TIER },
      lastTickAt: new Date(),
    },
  });
  revalidatePath("/");
  return { ok: true };
}

// "Tập trung cao độ": nhấn check-point để +1 vòng chu thiên ngay.
export async function focusReward(): Promise<ActionResult> {
  const character = await requireCharacter();
  if (character.mode !== "MEDITATE")
    return { ok: false, error: "Chỉ dùng khi đang thiền" };
  if (character.lastFocusAt && Date.now() - character.lastFocusAt.getTime() < 600)
    return { ok: false, error: "Chậm lại chút" };

  await grantFocusCycles(character, 1);
  revalidatePath("/");
  return { ok: true };
}

// Chọn ải để farm (quay về ải cũ). target < maxStage => khóa (không auto tiến).
export async function setCombatStage(stage: number): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runTick(character); // settle + lấy maxStage
  const target = Math.max(1, Math.min(Math.floor(stage), state.maxStage));
  await prisma.character.update({
    where: { id: character.id },
    data: { currentStage: target, stageLocked: target < state.maxStage },
  });
  revalidatePath("/");
  return { ok: true };
}

// Bật lại auto tiến ải (về ải cao nhất).
export async function setAutoAdvance(): Promise<ActionResult> {
  const character = await requireCharacter();
  const state = await runTick(character);
  await prisma.character.update({
    where: { id: character.id },
    data: { currentStage: state.maxStage, stageLocked: false },
  });
  revalidatePath("/");
  return { ok: true };
}
