import { SignOutButton } from "@/components/auth-buttons";
import { toggleMode } from "@/app/actions";
import { REALMS, ELEMENT_LABELS, type ElementKey } from "@/lib/game/balance";
import { expPerSecond } from "@/lib/game/engine";
import type { CharacterWithTechniques } from "@/lib/game/character";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-lg font-semibold text-white/90">{value}</div>
    </div>
  );
}

export function Dashboard({
  character,
  userName,
}: {
  character: CharacterWithTechniques;
  userName?: string | null;
}) {
  const realm = REALMS[Math.min(character.realm, REALMS.length - 1)];
  const exp = Number(character.exp);
  const need = isFinite(realm.expToNext) ? realm.expToNext : exp;
  const pct = need > 0 ? Math.min(100, (exp / need) * 100) : 100;

  const techs = character.techniques.map((t) => ({
    expMultiplier: t.technique.expMultiplier,
    level: t.level,
    active: t.active,
  }));
  const rate = expPerSecond(character.realm, techs);

  const isMeditating = character.mode === "MEDITATE";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-jade">Tu Tiên Nhàn Rỗi</h1>
          <p className="text-sm text-white/50">Đạo hữu {userName ?? "Vô Danh"}</p>
        </div>
        <SignOutButton />
      </header>

      {/* Cảnh giới + EXP */}
      <section className="mb-4 rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40">Cảnh giới</div>
            <div className="text-2xl font-bold text-gold">{realm.name}</div>
          </div>
          <div className="text-right text-sm text-white/50">
            Ngũ hành:{" "}
            <span className="font-semibold text-mystic">
              {ELEMENT_LABELS[character.element as ElementKey]}
            </span>
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-jade transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/40">
          <span>
            {Math.floor(exp).toLocaleString()} /{" "}
            {isFinite(need) ? need.toLocaleString() : "∞"} EXP
          </span>
          <span>+{rate.toFixed(1)} EXP/giây khi thiền</span>
        </div>
      </section>

      {/* Chế độ hiện tại */}
      <section className="mb-4 rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40">Đang</div>
            <div className="text-xl font-bold">
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
        <p className="text-sm text-white/50">
          Nhất tâm bất loạn — chỉ có thể làm một việc: thiền để lên tu vi (EXP),
          hoặc vượt ải để kiếm linh thạch (Gold) và vật phẩm.
        </p>
      </section>

      {/* Chỉ số */}
      <section className="rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
        <div className="mb-3 text-sm font-semibold text-white/70">Chỉ số</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Linh thạch" value={Number(character.gold).toLocaleString()} />
          <Stat label="Máu" value={character.hp} />
          <Stat label="Tấn công" value={character.atk} />
          <Stat label="Phòng thủ" value={character.def} />
          <Stat label="SM Vật lý" value={character.pPower} />
          <Stat label="SM Phép" value={character.mPower} />
          <Stat label="Thủ vật lý" value={character.pRes} />
          <Stat label="Thủ phép" value={character.mRes} />
          <Stat label="Tốc đánh" value={character.atkSpeed.toFixed(1)} />
          <Stat label="Ải cao nhất" value={character.highestStage} />
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-white/30">
        Phase 1 — nền tảng. Vòng thiền &amp; vượt ải (offline progress) sẽ có ở Phase 2–4.
      </p>
    </main>
  );
}
