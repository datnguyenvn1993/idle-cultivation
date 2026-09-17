import { prisma } from "@/lib/db/prisma";
import { EQUIPMENT_CATALOG } from "./equipment-data";

// Đồng bộ thư viện trang bị (code -> DB). Idempotent, gọi lúc load trang.
// Phase D sẽ thêm: rơi đồ khi clear ải + UI + cộng chỉ số từ trang bị.
export async function ensureEquipmentCatalog(): Promise<void> {
  await Promise.all(
    EQUIPMENT_CATALOG.map((e) => {
      const data = {
        name: e.name,
        slot: e.slot,
        rarity: e.rarity,
        realm: e.realm,
        element: e.element ?? null,
        statBonus: e.statBonus,
        dropStageMin: e.dropStageMin,
        dropStageMax: e.dropStageMax,
        dropRate: e.dropRate,
        sortOrder: e.sortOrder,
      };
      return prisma.equipment.upsert({
        where: { key: e.key },
        create: { key: e.key, ...data },
        update: data,
      });
    }),
  );
}
