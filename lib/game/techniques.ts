import { prisma } from "@/lib/db/prisma";
import {
  techniqueLevelCost,
  techniqueBonus,
  FREE_MAX_GOLD_LEVEL,
  type ElementKey,
} from "./balance";
import { TECHNIQUE_CATALOG } from "./techniques-data";
import type { TechniqueView } from "./types";

// Đồng bộ thư viện công pháp (code -> DB). Idempotent, gọi lúc load trang.
export async function ensureTechniqueCatalog(): Promise<void> {
  await Promise.all(
    TECHNIQUE_CATALOG.map((t) => {
      const data = {
        name: t.name,
        description: t.description,
        expMultiplier: t.expMultiplier,
        unlockRealm: t.unlockRealm,
        maxLevel: t.maxLevel,
        element: t.element ?? null,
        coverKey: t.coverKey,
        rarity: t.rarity,
        currency: t.currency,
        unlockCost: t.unlockCost,
        sortOrder: t.sortOrder,
      };
      return prisma.technique.upsert({
        where: { key: t.key },
        create: { key: t.key, ...data },
        update: data,
      });
    }),
  );
}

export async function getTechniquesView(
  characterId: string,
  currentMajor: number,
): Promise<TechniqueView[]> {
  const [catalog, owned] = await Promise.all([
    prisma.technique.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.charTechnique.findMany({ where: { characterId } }),
  ]);

  const ownedByTech = new Map(owned.map((o) => [o.techniqueId, o]));

  return catalog.map((t): TechniqueView => {
    const mine = ownedByTech.get(t.id);
    const level = mine?.level ?? 0;
    const active = mine?.active ?? false;
    const atMaxLevel = level >= t.maxLevel;
    const currency: "GOLD" | "STONE" = t.currency === "GOLD" ? "GOLD" : "STONE";
    // Free (GOLD) sau lv10: phải dùng vật phẩm (rơi từ quái) mới nâng tiếp.
    const needsItem = currency === "GOLD" && level >= FREE_MAX_GOLD_LEVEL && !atMaxLevel;
    return {
      id: t.id,
      key: t.key,
      name: t.name,
      description: t.description ?? "",
      element: (t.element as ElementKey | null) ?? null,
      coverKey: t.coverKey,
      rarity: t.rarity,
      currency,
      unlockRealm: t.unlockRealm,
      maxLevel: t.maxLevel,
      unlocked: currentMajor >= t.unlockRealm,
      owned: !!mine,
      learnCost: currency === "GOLD" ? 0 : t.unlockCost,
      level,
      active,
      multiplierNow: 1 + techniqueBonus(currency, t.unlockRealm, level),
      multiplierNext: 1 + techniqueBonus(currency, t.unlockRealm, level + 1),
      levelUpCost:
        atMaxLevel || needsItem ? 0 : techniqueLevelCost(level + 1, t.rarity, currency),
      atMaxLevel,
      needsItem,
    };
  });
}
