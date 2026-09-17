"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { syncTick, setCombatStage, setAutoAdvance } from "@/app/actions";
import { ELEMENT_LABELS } from "@/lib/game/balance";
import type { CharacterState } from "@/lib/game/types";

type Floater = { id: number; amount: number };

export function CombatView({ initial }: { initial: CharacterState }) {
  const [s, setS] = useState(initial);
  const [gold, setGold] = useState(initial.gold);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [pending, startTransition] = useTransition();

  const barRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const floaterId = useRef(0);

  const st = s.stage;

  const spawnFloater = useCallback((amount: number) => {
    const id = floaterId.current++;
    setFloaters((f) => [...f, { id, amount }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1200);
  }, []);

  // Thanh tiến độ clear; mỗi lượt xong -> +vàng (optimistic).
  useEffect(() => {
    if (!st.canSurvive) {
      progressRef.current = 0;
      if (barRef.current) barRef.current.style.width = "0%";
      return;
    }
    const clearMs = Math.max(200, st.clearTime * 1000);
    const reward = st.goldReward;
    let raf = 0;
    let last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(ts - last, 1000);
      last = ts;
      let p = progressRef.current + dt;
      while (p >= clearMs) {
        p -= clearMs;
        setGold((g) => g + reward);
        spawnFloater(reward);
      }
      progressRef.current = p;
      if (barRef.current) barRef.current.style.width = `${(p / clearMs) * 100}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [st.canSurvive, st.clearTime, st.goldReward, spawnFloater]);

  const doSync = useCallback(async () => {
    try {
      const ns = await syncTick();
      if (ns.mode !== "COMBAT") return;
      setS(ns);
      setGold(ns.gold);
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(doSync, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") doSync();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", doSync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", doSync);
    };
  }, [doSync]);

  const goStage = (idx: number) =>
    startTransition(async () => {
      await setCombatStage(idx);
      await doSync();
    });
  const goAuto = () =>
    startTransition(async () => {
      await setAutoAdvance();
      await doSync();
    });

  return (
    <section className="rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
      {/* Thanh chọn ải */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          disabled={pending || st.index <= 1}
          onClick={() => goStage(st.index - 1)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white/80 disabled:opacity-30"
        >
          ◀
        </button>
        <div className="text-center">
          <div className="text-lg font-bold text-gold">Ải {st.index}</div>
          <div className="text-[11px] text-white/50">
            {st.realmName} · mở khóa tới ải {s.maxStage}
          </div>
        </div>
        <button
          disabled={pending || st.index >= s.maxStage}
          onClick={() => goStage(st.index + 1)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white/80 disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      {/* Quái + sân đấu */}
      <div className="relative overflow-hidden rounded-xl bg-black/30 p-5 text-center ring-1 ring-white/5">
        <div className="text-5xl">{st.canSurvive ? "👹" : "💀"}</div>
        <div className="mt-1 text-sm font-semibold text-white/80">
          Yêu thú ải {st.index}{" "}
          <span className="text-mystic">[{ELEMENT_LABELS[st.element]}]</span>
        </div>
        <div className="mt-1 text-xs text-white/50">
          ❤️ {st.monsterHp.toLocaleString()} · ⚔️ {st.monsterDps.toLocaleString()}/s
        </div>
        <div className="text-xs text-white/40">
          🛡️ Thủ VL {st.monsterPRes.toLocaleString()} · Thủ phép{" "}
          {st.monsterMRes.toLocaleString()}
        </div>

        {/* thanh tiến độ clear */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div ref={barRef} className="h-full rounded-full bg-gradient-to-r from-gold to-jade" style={{ width: "0%" }} />
        </div>

        {/* vàng bay lên */}
        <div className="pointer-events-none absolute left-1/2 top-3">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="animate-exp-float absolute whitespace-nowrap text-sm font-bold text-gold"
              style={{ textShadow: "0 0 8px rgba(232,195,122,0.8)" }}
            >
              +{f.amount.toLocaleString()} 🪙
            </span>
          ))}
        </div>
      </div>

      {/* Kết quả mô phỏng */}
      {st.canSurvive ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <div className="text-[10px] uppercase text-white/40">Thời gian clear</div>
            <div className="font-semibold">{st.clearTime.toFixed(1)}s</div>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <div className="text-[10px] uppercase text-white/40">Vàng / giây</div>
            <div className="font-semibold text-gold">{st.goldPerSec.toFixed(1)} 🪙</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
          ⚠️ Chưa đủ sức qua ải này. Hãy tu luyện lên cảnh giới, phân bổ điểm chỉ số
          hoặc chọn ải thấp hơn.
        </div>
      )}

      {/* Lực chiến + auto */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
        <span className="text-white/60">
          Lực chiến: <b className="text-jade">{s.powerRating.toLocaleString()}</b> · Vàng:{" "}
          <b className="text-gold">{gold.toLocaleString()}</b>
        </span>
        {s.stageLocked ? (
          <button
            disabled={pending}
            onClick={goAuto}
            className="rounded-lg bg-mystic px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            ⤴ Auto tiến ải
          </button>
        ) : (
          <span className="text-xs text-jade">⤴ Đang auto tiến ải</span>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-white/30">
        Đang vượt ải — kiếm Vàng (offline 50%). Khi vượt ải thì tu vi (EXP) không tăng.
      </p>
    </section>
  );
}
