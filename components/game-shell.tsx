"use client";

import { useState } from "react";
import { MeditationView } from "@/components/meditation-view";
import { CongPhapPanel } from "@/components/cong-phap-panel";
import { toggleMode } from "@/app/actions";
import { signOutAction } from "@/app/actions-auth";
import type { CharacterState, TechniqueView } from "@/lib/game/types";

type TabId = "tu-luyen" | "cong-phap" | "ky-nang" | "talent" | "trang-bi";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "tu-luyen", label: "Tu Luyện", icon: "🧘" },
  { id: "cong-phap", label: "Công Pháp", icon: "📖" },
  { id: "ky-nang", label: "Kỹ Năng", icon: "⚔️" },
  { id: "talent", label: "Thiên Phú", icon: "🌟" },
  { id: "trang-bi", label: "Trang Bị", icon: "🎒" },
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-base font-semibold text-white/90">{value}</div>
    </div>
  );
}

function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="mt-10 text-center">
      <div className="text-5xl opacity-60">🚧</div>
      <div className="mt-3 text-lg font-bold">{title}</div>
      <p className="mx-auto mt-1 max-w-xs text-sm text-white/50">{note}</p>
    </div>
  );
}

export function GameShell({
  state,
  techniques,
  userName,
}: {
  state: CharacterState;
  techniques: TechniqueView[];
  userName?: string | null;
}) {
  const [tab, setTab] = useState<TabId>("tu-luyen");
  const isMeditating = state.mode === "MEDITATE";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-jade">
              {userName ?? state.name}
            </div>
            <div className="truncate text-xs text-gold">{state.tierName}</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/5 px-2.5 py-1">
              🪙 {state.gold.toLocaleString()}
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1">
              💎 {state.spiritStones.toLocaleString()}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full bg-white/5 px-2 py-1 text-white/50 hover:text-white/80"
                title="Đăng xuất"
              >
                ⏻
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Nội dung tab */}
      <main className="flex-1 px-4 py-4">
        {tab === "tu-luyen" && (
          <>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-panel/60 px-4 py-3 ring-1 ring-white/5">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Đang
                </div>
                <div className="text-base font-bold">
                  {isMeditating ? "🧘 Bế Quan" : "⚔️ Lịch Luyện"}
                </div>
              </div>
              <form action={toggleMode}>
                <button
                  type="submit"
                  className="rounded-xl bg-mystic/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mystic"
                >
                  Sang {isMeditating ? "Vượt ải" : "Thiền"}
                </button>
              </form>
            </div>

            {isMeditating ? (
              <MeditationView initial={state} />
            ) : (
              <section className="rounded-2xl bg-panel/80 p-8 text-center shadow-xl ring-1 ring-white/5">
                <div className="text-5xl">⚔️</div>
                <div className="mt-3 text-xl font-bold">Lịch Luyện (Vượt ải)</div>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
                  Trảm yêu kiếm Vàng &amp; vật phẩm — sẽ có ở phase sau. Khi vượt ải,
                  tu vi (EXP) không tăng.
                </p>
              </section>
            )}

            <section className="mt-4 rounded-2xl bg-panel/80 p-4 shadow-xl ring-1 ring-white/5">
              <div className="mb-2 text-sm font-semibold text-white/70">Chỉ số</div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Máu" value={state.hp} />
                <Stat label="Tấn công" value={state.atk} />
                <Stat label="Phòng thủ" value={state.def} />
                <Stat label="SM Vật lý" value={state.pPower} />
                <Stat label="SM Phép" value={state.mPower} />
                <Stat label="Tốc đánh" value={state.atkSpeed.toFixed(1)} />
                <Stat label="Thủ vật lý" value={state.pRes} />
                <Stat label="Thủ phép" value={state.mRes} />
                <Stat label="Ải cao nhất" value={state.highestStage} />
              </div>
            </section>
          </>
        )}

        {tab === "cong-phap" && (
          <CongPhapPanel
            techniques={techniques}
            major={state.realm}
            spiritStones={state.spiritStones}
          />
        )}

        {tab === "ky-nang" && (
          <ComingSoon
            title="Kỹ Năng — Thể Tu & Pháp Tu"
            note="Hai nhánh tu luyện: Thể tu (vật lý) và Pháp tu (phép/ngũ hành). Sắp ra mắt."
          />
        )}
        {tab === "talent" && (
          <ComingSoon title="Thiên Phú" note="Cây talent tăng chỉ số & hiệu ứng. Sắp ra mắt." />
        )}
        {tab === "trang-bi" && (
          <ComingSoon
            title="Trang Bị"
            note="Trang bị theo đại cảnh giới, 3 phẩm, tích lũy mảnh để lên cấp. Sắp ra mắt."
          />
        )}
      </main>

      {/* Thanh tab dưới đáy */}
      <nav className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto flex max-w-md border-t border-white/10 bg-ink/95 backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition ${
                tab === t.id ? "text-jade" : "text-white/45 hover:text-white/70"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
