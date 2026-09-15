# Tu Tiên Nhàn Rỗi (Idle Cultivation)

Webgame idle theo trường phái tu tiên. Hai vòng lặp tách biệt:

- **Bế Quan (Thiền)** → kiếm **EXP** theo thời gian (offline vẫn tăng), đột phá cảnh giới.
- **Lịch Luyện (Vượt ải)** → mô phỏng DPS vs máu quái → **Gold** + vật phẩm để nâng cấp & craft.

Người chơi **chọn 1 trong 2** ở mỗi thời điểm ("nhất tâm"). Ngũ hành tương sinh tương khắc
áp dụng cho sát thương phép; sát thương vật lý (thể tu) không dính ngũ hành.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Auth.js (NextAuth v5) — đăng nhập Google
- Prisma + PostgreSQL (Neon / Vercel Postgres / Supabase)
- Tailwind CSS
- Triển khai: Vercel (auto-deploy từ GitHub)

## Chạy local

```bash
npm install
cp .env.example .env        # rồi điền DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET
npx prisma db push          # tạo bảng
npm run db:seed             # (tùy chọn) nạp công pháp / ải / vật phẩm mẫu
npm run dev
```

Mở http://localhost:3000

## Biến môi trường

Xem `.env.example`. Cần:

- `DATABASE_URL`, `DIRECT_URL` — kết nối Postgres
- `AUTH_SECRET` — sinh bằng `npx auth secret`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — Google Cloud Console → OAuth Client ID
  - Authorized redirect URI (local): `http://localhost:3000/api/auth/callback/google`
  - Authorized redirect URI (prod): `https://<app>.vercel.app/api/auth/callback/google`

## Cấu trúc

```
app/                 # App Router: trang chính, API auth, server actions
components/           # UI (dashboard, nút auth)
lib/game/            # engine.ts (công thức), balance.ts (số cân bằng), character.ts
lib/db/prisma.ts     # Prisma client singleton
prisma/schema.prisma # data model (auth + game)
```

## Lộ trình

- [x] Phase 1 — Nền tảng: Next.js + Google Auth + Prisma + schema + dashboard
- [ ] Phase 2 — Engine thiền: EXP/giây, đột phá, offline tick (server-authoritative)
- [ ] Phase 3 — Công pháp: cây công pháp tăng tốc tu vi
- [ ] Phase 4 — Vượt ải: combat sim, ngũ hành, gold + drop
- [ ] Phase 5 — Nâng cấp (gold) + craft công khí + inventory
- [ ] Phase 6 — Cân bằng số, polish UI, deploy Vercel
