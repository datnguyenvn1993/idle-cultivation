import { SignOutButton } from "@/components/auth-buttons";
import { MeditationView } from "@/components/meditation-view";
import { toggleMode } from "@/app/actions";
import type { CharacterState } from "@/lib/game/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-lg font-semibold text-white/90">{value}</div>
    </div>
  );
}

function CombatPlaceholder() {
  return (
    <section className="rounded-2xl bg-panel/80 p-8 text-center shadow-xl ring-1 ring-white/5">
      <div className="text-5xl">⚔️</div>
      <div className="mt-3 text-xl font-bold">Lịch Luyện (Vượt ải)</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
        Chế độ vượt ải — trảm yêu kiếm linh thạch &amp; vật phẩm — sẽ có ở Phase 4.
        Trong lúc vượt ải, tu vi (EXP) sẽ không tăng.
      </p>
    </section>
  );
}

export function Dashboard({
  state,
  userName,
}: {
  state: CharacterState;
  userName?: string | null;
}) {
  const isMeditating = state.mode === "MEDITATE";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-jade">Tu Tiên Nhàn Rỗi</h1>
          <p className="text-sm text-white/50">Đạo hữu {userName ?? state.name}</p>
        </div>
        <SignOutButton />
      </header>

      {/* Chế độ hiện tại + nút chuyển */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-panel/60 px-5 py-3 ring-1 ring-white/5">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40">Đang</div>
          <div className="text-lg font-bold">
            {isMeditating ? "🧘 Bế Quan (Thiền)" : "⚔️ Lịch Luyện (Vượt ải)"}
          </div>
        </div>
        <form action={toggleMode}>
          <button
            type="submit"
            className="rounded-xl bg-mystic/80 px-5 py-3 font-semibold text-white transition hover:bg-mystic"
          >
            Chuyển sang {isMeditating ? "Vượt ải" : "Thiền"}
          </button>
        </form>
      </div>

      {/* Khu vực chính theo chế độ */}
      <div className="mb-4">
        {isMeditating ? <MeditationView initial={state} /> : <CombatPlaceholder />}
      </div>

      {/* Chỉ số */}
      <section className="rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
        <div className="mb-3 text-sm font-semibold text-white/70">Chỉ số</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Linh thạch" value={state.gold.toLocaleString()} />
          <Stat label="Máu" value={state.hp} />
          <Stat label="Tấn công" value={state.atk} />
          <Stat label="Phòng thủ" value={state.def} />
          <Stat label="SM Vật lý" value={state.pPower} />
          <Stat label="SM Phép" value={state.mPower} />
          <Stat label="Thủ vật lý" value={state.pRes} />
          <Stat label="Thủ phép" value={state.mRes} />
          <Stat label="Tốc đánh" value={state.atkSpeed.toFixed(1)} />
          <Stat label="Ải cao nhất" value={state.highestStage} />
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-white/30">
        Phase 2 — vòng luyện khí &amp; offline progress. Công pháp, vượt ải, craft ở
        các phase sau.
      </p>
    </main>
  );
}
