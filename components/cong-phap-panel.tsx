"use client";

import { useState, useTransition } from "react";
import { learnTechnique, toggleTechnique, levelTechnique } from "@/app/actions";
import { TechniqueCover } from "@/components/technique-cover";
import {
  ELEMENT_LABELS,
  RARITY_LABELS,
  realmName,
  activeSlots,
} from "@/lib/game/balance";
import type { TechniqueView } from "@/lib/game/types";

function pct(mult: number) {
  return `+${Math.round((mult - 1) * 100)}%`;
}

export function CongPhapPanel({
  techniques,
  major,
  spiritStones,
}: {
  techniques: TechniqueView[];
  major: number;
  spiritStones: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slots = activeSlots(major);
  const activeCount = techniques.filter((t) => t.active).length;
  const selected = techniques.find((t) => t.id === selectedId) ?? null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Có lỗi xảy ra");
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-white/70">
          Ô kích hoạt:{" "}
          <b className={activeCount >= slots ? "text-gold" : "text-jade"}>
            {activeCount}/{slots}
          </b>
        </span>
        <span className="text-white/70">
          💎 <b className="text-mystic">{spiritStones.toLocaleString()}</b> linh thạch
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {techniques.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setError(null);
              setSelectedId(t.id);
            }}
            className="group relative flex flex-col items-center"
          >
            <div
              className={`relative w-full overflow-hidden rounded-lg ring-1 transition ${
                t.active
                  ? "ring-2 ring-jade"
                  : "ring-white/10 group-hover:ring-white/30"
              }`}
            >
              <TechniqueCover
                coverKey={t.coverKey}
                rarity={t.rarity}
                element={t.element}
                locked={!t.unlocked}
              />
              {t.owned && (
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Lv {t.level}
                </span>
              )}
              {t.active && (
                <span className="absolute left-1 top-1 rounded bg-jade px-1.5 py-0.5 text-[10px] font-bold text-black">
                  Đang tu
                </span>
              )}
            </div>
            <span className="mt-1 line-clamp-2 text-center text-[11px] leading-tight text-white/80">
              {t.name}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        Kích hoạt công pháp để tăng EXP mỗi vòng luyện khí. Lên đại cảnh giới mở
        thêm ô kích hoạt.
      </p>

      {/* Chi tiết */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-panel p-5 ring-1 ring-white/10 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <TechniqueCover
                  coverKey={selected.coverKey}
                  rarity={selected.rarity}
                  element={selected.element}
                  locked={!selected.unlocked}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-gold">{selected.name}</div>
                <div className="mt-0.5 text-xs text-white/50">
                  {RARITY_LABELS[selected.rarity]} ·{" "}
                  {selected.element ? ELEMENT_LABELS[selected.element] : "Vô thuộc tính"}
                </div>
                <p className="mt-2 text-sm leading-snug text-white/70">
                  {selected.description}
                </p>
              </div>
            </div>

            {/* Hiệu quả */}
            <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm">
              {selected.owned ? (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">
                    Cấp {selected.level}
                    {selected.atMaxLevel ? " (tối đa)" : `/${selected.maxLevel}`}
                  </span>
                  <span className="font-semibold text-jade">
                    {pct(selected.multiplierNow)} EXP/vòng
                    {!selected.atMaxLevel && (
                      <span className="text-white/40">
                        {" "}
                        → {pct(selected.multiplierNext)}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-white/60">
                  Lĩnh ngộ để nhận {pct(Math.pow(selected.multiplierNext, 1))} EXP/vòng
                  (cấp 1)
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Hành động */}
            <div className="mt-4 flex gap-2">
              {!selected.unlocked ? (
                <div className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm text-white/40">
                  🔒 Cần đạt {realmName(selected.unlockRealm)}
                </div>
              ) : !selected.owned ? (
                <button
                  disabled={pending}
                  onClick={() => run(() => learnTechnique(selected.id))}
                  className="flex-1 rounded-xl bg-jade py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  Lĩnh ngộ
                </button>
              ) : (
                <>
                  <button
                    disabled={pending}
                    onClick={() => run(() => toggleTechnique(selected.id))}
                    className={`flex-1 rounded-xl py-3 font-semibold transition disabled:opacity-50 ${
                      selected.active
                        ? "bg-white/10 text-white/80 hover:bg-white/15"
                        : "bg-jade text-black hover:brightness-110"
                    }`}
                  >
                    {selected.active ? "Ngừng tu" : "Kích hoạt"}
                  </button>
                  <button
                    disabled={pending || selected.atMaxLevel}
                    onClick={() => run(() => levelTechnique(selected.id))}
                    className="flex-1 rounded-xl bg-mystic py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                  >
                    {selected.atMaxLevel
                      ? "Tối đa"
                      : `Nâng cấp · ${selected.levelUpCost.toLocaleString()}💎`}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedId(null)}
              className="mt-3 w-full py-2 text-center text-sm text-white/40 hover:text-white/70"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
