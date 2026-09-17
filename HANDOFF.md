# Tu Tiên Nhàn Rỗi — Tài liệu bàn giao (HANDOFF)

Tài liệu tổng hợp để tiếp tục phát triển (VD trong Antigravity). Đọc file này trước,
rồi xem `lib/game/balance.ts` (mọi con số cân bằng nằm ở đó).

Repo: https://github.com/datnguyenvn1993/idle-cultivation · Live: https://idle-cultivation-seven.vercel.app

---

## 1. Tổng quan game

Idle game **tu tiên**. Hai vòng lặp **tách biệt**, người chơi chỉ làm **một** việc tại một thời điểm ("nhất tâm"), đổi qua nút toggle:

- **Bế Quan (MEDITATE)** → kiếm **EXP** theo thời gian → lên **tầng / đại cảnh giới**. EXP CHỈ kiếm khi thiền.
- **Lịch Luyện (COMBAT / vượt ải)** → mô phỏng chiến đấu → **Vàng** + **mảnh trang bị**. (CHƯA build — xem Phase C.)

Toàn bộ tiến trình **server-authoritative** (tính theo timestamp, chống hack).

Đơn vị tiền: **Vàng** (rơi từ quái) và **Linh thạch** (💎, tiền cao cấp / "kim cương", để nạp sau này).

---

## 2. Tech stack

- **Next.js 15.5.25** (App Router) + **React 19** + **TypeScript**
- **Auth.js (NextAuth v5 beta)** — đăng nhập Google, Prisma adapter, session strategy = `database`
- **Prisma 6** + **PostgreSQL (Neon)**
- **Tailwind CSS 3**
- Deploy **Vercel** (auto-deploy từ nhánh `main` GitHub)
- Node 20+ (dev đang dùng Node 24)

---

## 3. Hạ tầng ĐÃ cấu hình sẵn (quan trọng)

- **GitHub**: `datnguyenvn1993/idle-cultivation`, nhánh `main`. Vercel auto-deploy mỗi push.
- **Vercel**: team `dat09-s-projects`, project `idle-cultivation`, domain sản xuất `idle-cultivation-seven.vercel.app`.
- **Neon Postgres**: DB `idle-cultivation-db` (region Singapore) nối qua Vercel Storage → tự tạo biến `DATABASE_URL` (pooled) và `DATABASE_URL_UNPOOLED` (direct). `prisma/schema.prisma` dùng đúng 2 tên này.
- **Google OAuth**: project Google Cloud `idle-cultivation-508816`. Client ID đã cấu hình redirect URI:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://idle-cultivation-seven.vercel.app/api/auth/callback/google`
  - App đang ở chế độ **Testing** → chỉ **test users** đăng nhập được (đã thêm email chủ dự án). Muốn mở public phải Publish app hoặc thêm test user.
- **Env vars trên Vercel** (Production+Preview): `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon tự thêm), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- ⚠️ **Tạo bảng lúc build**: `package.json` script `build = "prisma generate && prisma db push --skip-generate && next build"`. Nghĩa là mỗi lần deploy, Vercel tự `prisma db push` (đồng bộ schema vào Neon). Đổi schema chỉ cần push code — KHÔNG cần migrate thủ công. (Dev-mode; sau này nên chuyển sang `prisma migrate` cho production nghiêm túc.)

## 4. Chạy local

```bash
npm install
cp .env.example .env   # điền DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET
npx prisma db push     # tạo bảng
npm run dev            # http://localhost:3000
```
Build kiểm tra type nhanh mà không cần DB thật: `npx next build` (bỏ qua db push).

---

## 5. Cấu trúc thư mục

```
auth.ts                       # NextAuth v5 config (Google + Prisma adapter, session=database)
app/
  layout.tsx, globals.css     # layout + theme tối + keyframes hiệu ứng (qi, exp-float, breakthrough)
  page.tsx                    # server: auth → getOrCreateCharacter → ensureTechniqueCatalog
                              #         → runMeditationTick → getTechniquesView → <GameShell>
  actions.ts                  # server actions: syncTick, toggleMode, learn/toggle/levelTechnique,
                              #                 allocateStat, focusReward
  actions-auth.ts             # server action: signOutAction
  api/auth/[...nextauth]/route.ts
components/
  game-shell.tsx  (client)    # KHUNG mobile-first: header + thanh tab đáy + StatsSection (phân bổ điểm)
  meditation-view.tsx (client)# Sân thiền: người ngồi tu (SVG), khí vờn, vòng progress 5s,
                              #   số EXP bay, đột phá, "Tập trung cao độ" (check-point), banner offline
  cong-phap-panel.tsx (client)# Lưới công pháp nhóm theo cảnh giới, modal lĩnh ngộ/kích hoạt/nâng cấp
  technique-cover.tsx         # Ảnh bìa sách SVG (theo hệ ngũ hành + độ hiếm)
  auth-buttons.tsx            # nút Google sign in/out
lib/
  db/prisma.ts                # Prisma client singleton
  game/
    balance.ts                # ★ MỌI CON SỐ CÂN BẰNG + công thức thuần (cảnh giới, EXP, chỉ số, chi phí)
    engine.ts                 # hàm THUẦN: expPerCycle, cycleDurationMs, applyMeditationByTime,
                              #   elementMultiplier, computeCombat (combat sim sơ khai)
    tick.ts                   # SERVER: runMeditationTick (offline/online, cấp điểm), grantFocusCycles,
                              #   buildState (serialize + computeStats)
    character.ts              # getOrCreateCharacter (+ tặng quà khởi đầu)
    techniques.ts             # SERVER: ensureTechniqueCatalog (upsert), getTechniquesView
    techniques-data.ts        # ★ THƯ VIỆN công pháp (thêm công pháp mới = thêm 1 dòng)
    types.ts                  # CharacterState, TechniqueView, ... (type dùng chung client/server)
prisma/
  schema.prisma               # data model
  seed.ts                     # seed stage/item mẫu (chạy tay: npm run db:seed) — CHƯA dùng cho công pháp
types/next-auth.d.ts          # thêm user.id vào session
```

---

## 6. Data model (Prisma) — tóm tắt

**Auth.js**: `User, Account, Session, VerificationToken` (chuẩn adapter).

**Character** (1-1 với User):
- Tu luyện: `realm` (đại cảnh giới, index REALMS), `subLevel` (tầng 1..9), `exp` (BigInt, tu vi TRONG tầng hiện tại), `element` (ngũ hành), `mode` (MEDITATE|COMBAT), `lastTickAt`.
- Tiền: `gold` (Vàng), `spiritStones` (Linh thạch) — BigInt.
- Chỉ số nền (cột `hp,atk,def,pPower,mPower,pRes,mRes,atkSpeed`) — **hiện KHÔNG dùng để hiển thị**; chỉ số hiệu dụng tính bằng `computeStats`.
- Điểm chỉ số: `statPoints` + phân bổ `allocHp,allocAtk,allocDef,allocPPower,allocMPower,allocPRes,allocMRes`.
- Vượt ải: `highestStage`, `currentStage`.
- Khác: `starterGranted` (đã tặng quà khởi đầu), `lastFocusAt` (cooldown Tập trung cao độ).

**Technique** (thư viện công pháp — thêm dòng để có công pháp mới):
`key, name, description, expMultiplier, unlockRealm, maxLevel, element?, coverKey, rarity(1-3), currency("GOLD"|"STONE"), unlockCost, sortOrder`.

**CharTechnique** (sở hữu): `characterId, techniqueId, level, active` — unique `[characterId, techniqueId]`.

**Stage / Item / InventoryItem**: đã khai báo, **chưa dùng** (dành cho Phase C/D).

Enums: `GameMode {MEDITATE, COMBAT}`, `Element {KIM, MOC, THUY, HOA, THO}`.

---

## 7. Cơ chế ĐÃ hoàn thiện (+ công thức)

Tất cả hằng số ở `lib/game/balance.ts`.

### 7.1 Cảnh giới & cây EXP
- `REALMS[]`: 10 đại cảnh giới (Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp), mỗi cái có `expRate` (nhân EXP/vòng) + `statBonus`.
- Mỗi đại cảnh giới **9 tầng**. EXP để lên tầng:
  ```
  nền(major) = EXP_BASE(40) × MAJOR_JUMP(10)^major
  tầng 1..8  = nền × tầng
  tầng 9     = nền × 9 × BREAKTHROUGH_MULT(4)   ← bức tường đột phá đại cảnh giới
  ```
  Hàm: `expForTier(major, sub)`, `tierName`, `isMaxTier`, `totalTierIndex`.

### 7.2 Chu thiên (thiền) — thuật ngữ hiển thị là "chu thiên" (code vẫn gọi cycle)
- `CYCLE_SECONDS = 10`. Mỗi **chu thiên** cộng:
  ```
  expPerCycle(major, techs) = BASE_EXP_PER_CYCLE(5) × REALMS[major].expRate × ∏(tech.expMultiplier^level cho tech active)
  cycleDurationMs(speedMult) = 10000 / speedMult   (buff tốc độ sau này rút ngắn)
  ```
- `applyMeditationByTime(major, sub, exp, elapsedMs, techs, speedMult, expRate)` — chạy chung online & offline.

### 7.3 Offline vs Online
- Trong `runMeditationTick`: `elapsed = now - lastTickAt`.
  - `elapsed <= ONLINE_GRACE_MS(3')` → **online 100%** (`expRate=1`).
  - ngược lại → **offline 50%** (`OFFLINE_RATE=0.5`), cap `MAX_OFFLINE_SECONDS(8h)`.
- Giữ tiến trình dư: `lastTickAt = now - leftoverMs`.
- Client (`meditation-view`) animate cục bộ + gọi `syncTick()` mỗi 60s và khi focus/visible để đồng bộ authoritative.

### 7.4 Điểm chỉ số
- Lên mỗi tầng → `+STAT_POINTS_PER_TIER(3)` điểm (tính trong `runMeditationTick` & `grantFocusCycles`).
- Phân bổ qua `allocateStat(stat)`; chỉ số hiệu dụng:
  ```
  computeStats(major, alloc) = REALMS[major].statBonus[k] + alloc[k] × STAT_POINT_GAINS[k]
  STAT_POINT_GAINS = {hp:20, atk:3, def:2, pPower:3, mPower:3, pRes:2, mRes:2}
  ```
- Chỉ số CHO PHÉP phân bổ: `STAT_KEYS = [pPower, mPower, pRes, mRes, hp]` (đã bỏ atk "Tấn công" & def "Phòng thủ" khỏi UI — trùng với pPower/pRes). UI xếp cặp: Công vật lý|Công phép, Thủ vật lý|Thủ phép, Máu|Tốc đánh (Tốc đánh chỉ hiển thị).

### 7.5 Công pháp (2 bộ / cảnh giới)
- Bộ **GOLD**: free lĩnh ngộ, nâng cấp bằng Vàng. Bộ **STONE**: lĩnh ngộ tốn Linh thạch (`unlockCost`), nâng bằng Linh thạch.
- `techniqueLevelCost(level, rarity, currency)` — GOLD ×120, STONE ×40 trên `rarity×level×1.35^(level-1)`.
- Giới hạn kích hoạt: `activeSlots(major) = 1 + major`. **Cả 2 bộ active đều cộng dồn** vào expPerCycle.
- Server settle tick TRƯỚC mỗi thay đổi (learn/toggle/level) để không lệch EXP.

### 7.6 Tập trung cao độ
- Client bật 1 **phiên** dài `FOCUS_DURATION_MS(30s)`: check-point sinh ngẫu nhiên mỗi **5–10s**, chạm gọi `focusReward()` → `grantFocusCycles(+1 vòng)` (100%). Hết phiên → **hồi chiêu** `FOCUS_COOLDOWN_MS(4')` (lưu `localStorage.focusCooldownUntil`, có đếm ngược). Server còn chốt 600ms `lastFocusAt` chống spam. Giới hạn để không lên cấp quá nhanh.
- ⚠️ Hồi chiêu hiện enforce ở CLIENT (localStorage). Muốn chống cheat thật cần lưu mốc phiên/hồi chiêu ở server.

### 7.7 Quà khởi đầu
- `STARTER_STONES(500)` + `STARTER_GOLD(300)`, trao 1 lần qua `starterGranted`.

---

## 8. Mẫu code quan trọng (giữ nhất quán khi code tiếp)

- **Server-authoritative**: mọi thay đổi tài nguyên/tiến trình chạy trong **server action** (`app/actions.ts`), gọi `runMeditationTick` để "settle" trước, rồi `revalidatePath("/")`. Client KHÔNG tự cộng tài nguyên thật.
- **Hàm thuần** ở `engine.ts`/`balance.ts` (không chạm DB) → tái dùng ở cả client (hiển thị) lẫn server (authoritative).
- **Serialize**: BigInt → Number khi trả về client (xem `buildState`). Type chung ở `types.ts`.
- **Thêm công pháp mới**: thêm 1 phần tử vào `techniques-data.ts` (có `currency`, `unlockCost`, `coverKey`, `element`, `rarity`, `unlockRealm`) → tự upsert vào DB lúc load. Ảnh bìa: thêm palette mới trong `technique-cover.tsx` nếu cần `coverKey` mới.
- **Đổi schema**: sửa `schema.prisma` → push code → Vercel tự `db push`. Tránh xóa cột (mất dữ liệu; `db push` không có `--accept-data-loss`).
- **Mobile-first**: khung `max-w-md`, thanh tab cố định đáy. Test ở ~390px.

---

## 9. Roadmap còn lại

### Phase C — Vượt ải (PvE) — ✅ ĐÃ BUILD (vòng Vàng; chưa rơi trang bị)
Đã có: `lib/game/combat.ts` (stageSpec/simulateStage/maxSurvivableStage/powerRating), `runCombatTick`+`runTick` trong tick.ts, actions `setCombatStage`/`setAutoAdvance`, `components/combat-view.tsx`, `Character.stageLocked`. Auto tiến ải cao nhất đủ sức + cho quay về ải cũ (khóa auto). CÒN THIẾU: rơi mảnh trang bị (Phase D) — thêm dropTable vào runCombatTick.
Công thức đã dùng (khớp code):

```
# Sức mạnh nhân vật
physDPS  = pPower × atkSpeed                 (thể tu, KHÔNG ngũ hành)
magicDPS = mPower × atkSpeed × elementMult   (pháp tu, CÓ ngũ hành ±25%)
DPS      = physDPS + magicDPS
giảm_res = res / (res + K(realm))             (giảm dần, không đạt 100%)
EHP      = hp / (1 − giảm_trung_bình)

# Quái neo theo SỨC MẠNH KỲ VỌNG của cảnh giới (mấu chốt):
expDPS(realm), expEHP(realm)  ← từ REALMS[realm].statBonus (phân bổ trung bình)
monsterHP  = expDPS(realm) × TARGET_CLEAR_TIME × hệ_số_ải
monsterDPS = expEHP(realm) / TARGET_SURVIVE_TIME × hệ_số_ải

# Clear + thưởng
clearTime = max(MIN_CLEAR_TIME(0.5s), monsterHP / max(DPS,1))
sốngSót   = monsterDPS × clearTime < EHP   → sai thì KẸT ải
Vàng/giây = goldReward / clearTime          (có TRẦN chống farm vỡ)
rơi mảnh trang bị theo dropTable × rarity
```
Guardrails: (1) quái neo theo expPower cảnh giới; (2) MIN_CLEAR_TIME; (3) trần vàng/giây; (4) res/(res+K) giảm dần; (5) `max(x,1)` mọi phép chia; (6) Power Rating gate mở ải; (7) offline combat 50% cap 8h; (8) mọi số để `balance.ts`.
Cần: seed `Stage` theo công thức (không nhập tay), `Character.combatStage`, tick vượt ải riêng, `powerRating(stats)`.
Nhớ: **vượt ải KHÔNG kiếm EXP** (tách 2 vòng lặp).

### Phase D — Trang bị (tích lũy)
- Mỗi đại cảnh giới × 3 phẩm (Thường/Hiếm/Siêu hiếm) × mỗi loại (vũ khí/giáp/phụ kiện...).
- Đánh quái rơi **mảnh** → gom đủ **lên cấp** loại đó (idle merge). Chỉ số nhân vật = **TỔNG** chỉ số mọi trang bị (cộng vào `computeStats`).

### Phase E — Kỹ năng (2 nhánh) + Talent
- **Thể tu** (vật lý): buff pPower/hp/def (không ngũ hành).
- **Pháp tu** (phép): buff mPower + ngũ hành.
- **Talent**: cây điểm tăng chỉ số/hiệu ứng.
- Tab **Kỹ Năng / Thiên Phú / Trang Bị** hiện là placeholder trong `game-shell.tsx` — thay bằng panel thật.

### Việc kỹ thuật nên làm khi lên production thật
- Chuyển `prisma db push` (trong build) → `prisma migrate deploy` + migrations.
- Google OAuth: Publish app (thoát Testing) để mọi người đăng nhập.
- Cân bằng lại số ở `balance.ts` sau khi có combat.
- Cân nhắc chuyển tính toán tick nặng sang cron/edge nếu nhiều người chơi.

---

## 10. Lưu ý / bẫy đã biết
- Chỉ số hiển thị = `computeStats` (cảnh giới + phân bổ), KHÔNG phải cột hp/atk trong DB.
- EXP là `exp` TRONG tầng hiện tại (không phải tổng tích lũy).
- Kích hoạt/nâng công pháp phải `runMeditationTick` trước (đã làm trong actions) để EXP không bị tính sai theo hệ số mới.
- `db push` mỗi build: không xóa cột tùy tiện.
- BigInt: luôn convert sang Number trước khi gửi client.
