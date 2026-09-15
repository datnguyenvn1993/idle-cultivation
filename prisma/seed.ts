import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ---- Công pháp (techniques) ----
  const techniques = [
    { key: "dan_khi",   name: "Dẫn Khí Quyết",   expMultiplier: 1.15, unlockRealm: 0, maxLevel: 10, description: "Công pháp nhập môn, tăng nhẹ tốc độ hấp thụ linh khí." },
    { key: "tu_nguyen", name: "Tụ Nguyên Công",  expMultiplier: 1.30, unlockRealm: 1, maxLevel: 10, description: "Ngưng tụ linh khí thành đan điền, tăng tốc tu vi rõ rệt." },
    { key: "cuu_chuyen", name: "Cửu Chuyển Kim Đan", expMultiplier: 1.55, unlockRealm: 3, maxLevel: 10, description: "Đại pháp thượng thừa, mỗi cấp nhân mạnh tốc độ tu luyện." },
  ];
  for (const t of techniques) {
    await prisma.technique.upsert({ where: { key: t.key }, update: t, create: t });
  }

  // ---- Ải (stages) ----
  const elements = ["KIM", "MOC", "THUY", "HOA", "THO"] as const;
  for (let i = 1; i <= 20; i++) {
    const monsterHp = BigInt(Math.round(80 * Math.pow(1.35, i - 1)));
    const monsterDps = Math.round(6 * Math.pow(1.28, i - 1));
    const goldReward = BigInt(Math.round(10 * Math.pow(1.3, i - 1)));
    await prisma.stage.upsert({
      where: { index: i },
      update: {},
      create: {
        index: i,
        name: `Ải ${i}`,
        monsterHp,
        monsterDps,
        element: elements[(i - 1) % elements.length],
        goldReward,
        dropTable: [{ itemKey: "linh_thiet", chance: 0.2 }],
      },
    });
  }

  // ---- Vật phẩm (items) ----
  const items = [
    { key: "linh_thiet", name: "Linh Thiết", type: "MATERIAL" as const, statBonus: undefined, craftRecipe: undefined },
    {
      key: "phi_kiem_so",
      name: "Phi Kiếm Sơ Cấp",
      type: "EQUIPMENT" as const,
      slot: "weapon",
      element: "KIM" as const,
      statBonus: { atk: 15, pPower: 10 },
      craftRecipe: [{ itemKey: "linh_thiet", quantity: 5 }],
    },
  ];
  for (const it of items) {
    await prisma.item.upsert({
      where: { key: it.key },
      update: {},
      create: it as never,
    });
  }

  console.log("Seed xong: công pháp, ải, vật phẩm khởi đầu.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
