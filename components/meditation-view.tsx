"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncTick } from "@/app/actions";
import { REALMS, realmName, ELEMENT_LABELS, type ElementKey } from "@/lib/game/balance";
import { expPerCycle, expToNext, type ActiveTechnique } from "@/lib/game/engine";
import type { CharacterState } from "@/lib/game/types";

type Floater = { id: number; amount: number };

const RING_R = 125;
const RING_C = 2 * Math.PI * RING_R;

export function MeditationView({ initial }: { initial: CharacterState }) {
  const active: ActiveTechnique[] = useMemo(
    () =>
      initial.techniques.map((t) => ({
        expMultiplier: t.expMultiplier,
        level: t.level,
        active: t.active,
      })),
    [initial.techniques],
  );

  const cycleMs = initial.cycleMs;

  const [realm, setRealm] = useState(initial.realm);
  const [exp, setExp] = useState(initial.exp);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [offline, setOffline] = useState(
    initial.gainedThisTick > 0
      ? { gained: initial.gainedThisTick, cycles: initial.cyclesThisTick }
      : null,
  );

  // Refs cho vòng lặp animation (không gây re-render mỗi frame).
  const realmRef = useRef(initial.realm);
  const expRef = useRef(initial.exp);
  const progressRef = useRef(initial.cycleProgressMs);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const floaterId = useRef(0);

  const perCycle = expPerCycle(realm, active);
  const threshold = expToNext(realm);
  const pctExp = isFinite(threshold) ? Math.min(100, (exp / threshold) * 100) : 100;

  const spawnFloater = useCallback((amount: number) => {
    const id = floaterId.current++;
    setFloaters((f) => [...f, { id, amount }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const completeCycle = useCallback(() => {
    const pc = expPerCycle(realmRef.current, active);
    let ne = expRef.current + pc;
    let r = realmRef.current;
    let broke = false;
    while (r < REALMS.length - 1) {
      const need = REALMS[r].expToNext;
      if (!isFinite(need) || ne < need) break;
      ne -= need;
      r += 1;
      broke = true;
    }
    expRef.current = ne;
    setExp(ne);
    if (r !== realmRef.current) {
      realmRef.current = r;
      setRealm(r);
    }
    if (broke) setFlashKey((k) => k + 1);
    spawnFloater(pc);
  }, [active, spawnFloater]);

  // Vòng lặp animation: đổ đầy thanh vòng luyện khí, hoàn thành thì cộng EXP.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (ts: number) => {
      // clamp dt: khi tab ẩn rAF dừng; lúc quay lại để server sync xử lý, không cộng dồn ở client.
      const dt = Math.min(ts - last, 1000);
      last = ts;
      let p = progressRef.current + dt;
      while (p >= cycleMs) {
        p -= cycleMs;
        completeCycle();
      }
      progressRef.current = p;
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(RING_C * (1 - p / cycleMs));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cycleMs, completeCycle]);

  // Đồng bộ server-authoritative: định kỳ 60s + khi quay lại tab.
  const doSync = useCallback(async () => {
    try {
      const s = await syncTick();
      if (s.mode !== "MEDITATE") return;
      realmRef.current = s.realm;
      expRef.current = s.exp;
      progressRef.current = s.cycleProgressMs;
      setRealm(s.realm);
      setExp(s.exp);
    } catch {
      /* bỏ qua lỗi mạng tạm thời */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(doSync, 60_000);
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

  return (
    <section className="rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
      {offline && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-jade/30 bg-jade/10 px-4 py-2 text-sm">
          <span className="text-jade">
            🧘 Bế quan lúc vắng mặt: <b>+{offline.gained.toLocaleString()} EXP</b>{" "}
            ({offline.cycles.toLocaleString()} vòng)
          </span>
          <button
            onClick={() => setOffline(null)}
            className="text-white/40 hover:text-white/80"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sân khấu thiền */}
      <div className="relative mx-auto flex h-[300px] w-full max-w-[300px] items-center justify-center">
        {/* Hào quang nền */}
        <div
          className="animate-qi-breathe absolute h-[240px] w-[240px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(61,220,151,0.35) 0%, rgba(139,123,216,0.15) 45%, transparent 70%)",
          }}
        />
        {/* Vòng khí xoay */}
        <div className="animate-qi-spin absolute h-[250px] w-[250px] rounded-full border border-dashed border-jade/30" />
        <div className="animate-qi-spin-rev absolute h-[205px] w-[205px] rounded-full border border-dashed border-mystic/30" />

        {/* Hạt khí bay lên */}
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="animate-qi-rise absolute bottom-[70px] block h-1.5 w-1.5 rounded-full bg-jade/80"
            style={{
              left: `${38 + i * 6}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: "2.6s",
              animationIterationCount: "infinite",
            }}
          />
        ))}

        {/* Vòng progress luyện khí (5s) */}
        <svg className="absolute h-[280px] w-[280px] -rotate-90" viewBox="0 0 280 280">
          <circle
            cx="140"
            cy="140"
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            ref={ringRef}
            cx="140"
            cy="140"
            r={RING_R}
            fill="none"
            stroke="#3ddc97"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C}
            style={{ filter: "drop-shadow(0 0 6px rgba(61,220,151,0.7))" }}
          />
        </svg>

        {/* Người tu luyện */}
        <svg
          className="animate-sit-breathe relative z-10"
          width="150"
          height="150"
          viewBox="0 0 120 120"
        >
          <defs>
            <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a5a86" />
              <stop offset="100%" stopColor="#2a3350" />
            </linearGradient>
          </defs>
          {/* bệ ngồi */}
          <ellipse cx="60" cy="98" rx="36" ry="9" fill="rgba(139,123,216,0.25)" />
          {/* chân xếp bằng */}
          <path d="M26 92 Q60 78 94 92 Q60 104 26 92 Z" fill="#39456a" />
          {/* thân + áo choàng */}
          <path
            d="M60 42 C40 46 38 82 46 92 L74 92 C82 82 80 46 60 42 Z"
            fill="url(#robe)"
          />
          {/* tay đặt trước bụng (thiền định) */}
          <path
            d="M46 74 Q60 86 74 74"
            fill="none"
            stroke="#5566a0"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* cổ */}
          <rect x="55" y="30" width="10" height="12" rx="4" fill="#e8c9a8" />
          {/* đầu */}
          <circle cx="60" cy="26" r="12" fill="#f0d3b0" />
          {/* búi tóc */}
          <circle cx="60" cy="14" r="5" fill="#2a2a3a" />
          <path d="M48 24 Q60 12 72 24" fill="none" stroke="#2a2a3a" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* Lóe sáng đột phá */}
        {flashKey > 0 && (
          <div
            key={flashKey}
            className="animate-breakthrough pointer-events-none absolute h-[200px] w-[200px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(232,195,122,0.9) 0%, rgba(232,195,122,0.3) 40%, transparent 70%)",
            }}
          />
        )}

        {/* Số EXP bay lên */}
        <div className="pointer-events-none absolute left-1/2 top-8">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="animate-exp-float absolute whitespace-nowrap text-sm font-bold text-jade"
              style={{ textShadow: "0 0 8px rgba(61,220,151,0.8)" }}
            >
              +{f.amount.toLocaleString()} EXP
            </span>
          ))}
        </div>
      </div>

      {/* Cảnh giới + thanh EXP */}
      <div className="mt-2">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-lg font-bold text-gold">{realmName(realm)}</span>
          <span className="text-xs text-white/50">
            Ngũ hành:{" "}
            <b className="text-mystic">{ELEMENT_LABELS[initial.element as ElementKey]}</b>
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-jade to-mystic transition-[width] duration-300"
            style={{ width: `${pctExp}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/40">
          <span>
            {Math.floor(exp).toLocaleString()} /{" "}
            {isFinite(threshold) ? threshold.toLocaleString() : "∞"} EXP
          </span>
          <span>
            +{perCycle.toLocaleString()} EXP / vòng · {(cycleMs / 1000).toFixed(0)}s/vòng
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        Đang bế quan — mỗi vòng luyện khí hoàn thành sẽ cộng tu vi. Tu vi vẫn tăng
        khi bạn offline (tối đa 24 giờ).
      </p>
    </section>
  );
}
