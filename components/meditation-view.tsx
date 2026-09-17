"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { syncTick, focusReward, breakthrough } from "@/app/actions";
import { MeditationBackground } from "@/components/meditation-background";
import {
  expForTier,
  isMaxTier,
  tierName,
  realmName,
  techniqueBonus,
  SUB_TIERS,
  ELEMENT_LABELS,
  FOCUS_DURATION_MS,
  FOCUS_COOLDOWN_MS,
  type ElementKey,
} from "@/lib/game/balance";
import { expPerCycle, type ActiveTechnique } from "@/lib/game/engine";
import type { CharacterState } from "@/lib/game/types";

type Floater = { id: number; amount: number };

const RING_R = 125;
const RING_C = 2 * Math.PI * RING_R;

export function MeditationView({ initial }: { initial: CharacterState }) {
  const active: ActiveTechnique[] = useMemo(
    () =>
      initial.techniques.map((t) => ({
        bonus: techniqueBonus(t.currency, t.unlockRealm, t.level),
        active: t.active,
      })),
    [initial.techniques],
  );

  const cycleMs = initial.cycleMs;

  const [major, setMajor] = useState(initial.realm);
  const [sub, setSub] = useState(initial.subLevel);
  const [exp, setExp] = useState(initial.exp);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [offline, setOffline] = useState(
    initial.offlineThisTick && initial.gainedThisTick > 0
      ? { gained: initial.gainedThisTick, cycles: initial.cyclesThisTick }
      : null,
  );
  const [focusOn, setFocusOn] = useState(false);
  const [orbs, setOrbs] = useState<{ id: number; x: number; y: number }[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [sessionEndsAt, setSessionEndsAt] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const orbId = useRef(0);

  // Khôi phục hồi chiêu focus từ localStorage (sống sót qua reload).
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("focusCooldownUntil") || 0);
      if (v > Date.now()) setCooldownUntil(v);
    } catch {}
  }, []);

  // Đồng hồ 1s để cập nhật đếm ngược khi đang focus hoặc đang hồi chiêu.
  useEffect(() => {
    if (!focusOn && cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [focusOn, cooldownUntil]);

  const onCooldown = cooldownUntil > nowTs;
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000));

  const majorRef = useRef(initial.realm);
  const subRef = useRef(initial.subLevel);
  const expRef = useRef(initial.exp);
  const progressRef = useRef(initial.cycleProgressMs);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const floaterId = useRef(0);

  const perCycle = expPerCycle(major, active);
  const threshold = expForTier(major, sub);
  const atMax = isMaxTier(major, sub);
  const pctExp = Math.min(100, (exp / threshold) * 100);
  const ready = sub >= SUB_TIERS && exp >= threshold && !atMax; // sẵn sàng Độ Kiếp
  const [btPending, startBt] = useTransition();

  const spawnFloater = useCallback((amount: number) => {
    const id = floaterId.current++;
    setFloaters((f) => [...f, { id, amount }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const completeCycle = useCallback(() => {
    const mj = majorRef.current;
    if (isMaxTier(mj, subRef.current)) return;
    // Đầy tầng 9 -> chờ Độ Kiếp (không tự đột phá đại cảnh giới).
    if (subRef.current >= SUB_TIERS && expRef.current >= expForTier(mj, subRef.current))
      return;
    const pc = expPerCycle(mj, active);
    let ne = expRef.current + pc;
    let sb = subRef.current;
    while (sb < SUB_TIERS) {
      const need = expForTier(mj, sb);
      if (ne < need) break;
      ne -= need;
      sb += 1;
    }
    if (sb >= SUB_TIERS) {
      const cap = expForTier(mj, sb);
      if (ne > cap) ne = cap;
    }
    expRef.current = ne;
    setExp(ne);
    if (sb !== subRef.current) {
      subRef.current = sb;
      setSub(sb);
    }
    spawnFloater(pc);
  }, [active, spawnFloater]);

  // Vòng lặp animation
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(ts - last, 1000);
      last = ts;
      const paused =
        isMaxTier(majorRef.current, subRef.current) ||
        (subRef.current >= SUB_TIERS &&
          expRef.current >= expForTier(majorRef.current, subRef.current));
      if (!paused) {
        let p = progressRef.current + dt;
        while (p >= cycleMs) {
          p -= cycleMs;
          completeCycle();
        }
        progressRef.current = p;
        if (ringRef.current) {
          ringRef.current.style.strokeDashoffset = String(RING_C * (1 - p / cycleMs));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cycleMs, completeCycle]);

  // Đồng bộ server-authoritative
  const doSync = useCallback(async () => {
    try {
      const s = await syncTick();
      if (s.mode !== "MEDITATE") return;
      majorRef.current = s.realm;
      subRef.current = s.subLevel;
      expRef.current = s.exp;
      progressRef.current = s.cycleProgressMs;
      setMajor(s.realm);
      setSub(s.subLevel);
      setExp(s.exp);
    } catch {
      /* bỏ qua lỗi mạng tạm thời */
    }
  }, []);

  const doBreakthrough = useCallback(() => {
    startBt(async () => {
      const r = await breakthrough();
      if (r.ok) {
        setFlashKey((k) => k + 1);
        await doSync();
      }
    });
  }, [doSync]);

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

  // "Tập trung cao độ": phiên giới hạn, check-point ngẫu nhiên 5–10s, xong vào hồi chiêu.
  useEffect(() => {
    if (!focusOn) {
      setOrbs([]);
      return;
    }
    let alive = true;
    let spawnTimer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      if (!alive) return;
      const id = orbId.current++;
      const x = 12 + Math.random() * 76;
      const y = 14 + Math.random() * 58;
      setOrbs((o) => [...o, { id, x, y }]);
      setTimeout(() => setOrbs((o) => o.filter((k) => k.id !== id)), 3200);
      spawnTimer = setTimeout(spawn, 5000 + Math.random() * 5000); // 5–10s
    };
    spawnTimer = setTimeout(spawn, 700);

    const endTimer = setTimeout(() => {
      const until = Date.now() + FOCUS_COOLDOWN_MS;
      setCooldownUntil(until);
      try {
        localStorage.setItem("focusCooldownUntil", String(until));
      } catch {}
      setFocusOn(false);
    }, FOCUS_DURATION_MS);

    return () => {
      alive = false;
      clearTimeout(spawnTimer);
      clearTimeout(endTimer);
    };
  }, [focusOn]);

  const startFocus = useCallback(() => {
    if (focusOn || cooldownUntil > Date.now()) return;
    setSessionEndsAt(Date.now() + FOCUS_DURATION_MS);
    setFocusOn(true);
  }, [focusOn, cooldownUntil]);

  const clickOrb = useCallback(
    (id: number) => {
      setOrbs((o) => o.filter((k) => k.id !== id));
      completeCycle(); // phản hồi tức thì (+1 vòng optimistic)
      focusReward()
        .then(() => doSync())
        .catch(() => {});
    },
    [completeCycle, doSync],
  );

  return (
    <section className="rounded-2xl bg-panel/80 p-5 shadow-xl ring-1 ring-white/5">
      {offline && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-jade/30 bg-jade/10 px-4 py-2 text-sm">
          <span className="text-jade">
            🧘 Tu luyện offline (50%): <b>+{offline.gained.toLocaleString()} EXP</b>{" "}
            ({offline.cycles.toLocaleString()} chu thiên)
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
        <MeditationBackground />
        <div
          className="animate-qi-breathe absolute h-[240px] w-[240px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(61,220,151,0.35) 0%, rgba(139,123,216,0.15) 45%, transparent 70%)",
          }}
        />
        <div className="animate-qi-spin absolute h-[250px] w-[250px] rounded-full border border-dashed border-jade/30" />
        <div className="animate-qi-spin-rev absolute h-[205px] w-[205px] rounded-full border border-dashed border-mystic/30" />

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
          <ellipse cx="60" cy="98" rx="36" ry="9" fill="rgba(139,123,216,0.25)" />
          <path d="M26 92 Q60 78 94 92 Q60 104 26 92 Z" fill="#39456a" />
          <path
            d="M60 42 C40 46 38 82 46 92 L74 92 C82 82 80 46 60 42 Z"
            fill="url(#robe)"
          />
          <path
            d="M46 74 Q60 86 74 74"
            fill="none"
            stroke="#5566a0"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect x="55" y="30" width="10" height="12" rx="4" fill="#e8c9a8" />
          <circle cx="60" cy="26" r="12" fill="#f0d3b0" />
          <circle cx="60" cy="14" r="5" fill="#2a2a3a" />
          <path
            d="M48 24 Q60 12 72 24"
            fill="none"
            stroke="#2a2a3a"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

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

        {/* Check-point Tập trung cao độ */}
        {orbs.map((o) => (
          <button
            key={o.id}
            onClick={() => clickOrb(o.id)}
            className="absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold text-lg shadow-lg ring-2 ring-gold/60"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              animation: "qi-breathe 1.2s ease-in-out infinite",
              boxShadow: "0 0 14px rgba(232,195,122,0.9)",
            }}
            aria-label="Điểm tập trung"
          >
            ✦
          </button>
        ))}
      </div>

      {/* Nút Tập trung cao độ (phiên giới hạn + hồi chiêu) */}
      <button
        onClick={startFocus}
        disabled={focusOn || onCooldown}
        className={`mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
          focusOn
            ? "bg-gold text-black"
            : onCooldown
              ? "bg-white/5 text-white/40"
              : "bg-white/10 text-white/80 hover:bg-white/15"
        }`}
      >
        {focusOn
          ? `✦ Đang tập trung — chạm điểm sáng (${Math.max(0, Math.ceil((sessionEndsAt - nowTs) / 1000))}s)`
          : onCooldown
            ? `✦ Tập trung cao độ — hồi chiêu ${cooldownLeft}s`
            : "✦ Tập trung cao độ"}
      </button>

      {/* Cảnh giới · tầng + thanh EXP */}
      <div className="mt-2">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-lg font-bold text-gold">{tierName(major, sub)}</span>
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
            {atMax
              ? "Đã đạt đỉnh phong"
              : `${Math.floor(exp).toLocaleString()} / ${threshold.toLocaleString()} EXP`}
          </span>
          <span>
            +{perCycle.toLocaleString()} EXP / chu thiên · {(cycleMs / 1000).toFixed(0)}s/chu thiên
          </span>
        </div>
      </div>

      {ready && (
        <button
          onClick={doBreakthrough}
          disabled={btPending}
          className="animate-qi-breathe mt-3 w-full rounded-xl bg-gradient-to-r from-gold to-mystic py-3 text-center font-bold text-black shadow-lg transition hover:brightness-110 disabled:opacity-60"
        >
          ⚡ ĐỘ KIẾP — Đột phá {realmName(major + 1)}
        </button>
      )}

      <p className="mt-4 text-center text-xs text-white/30">
        {ready
          ? "Tu vi đã viên mãn tầng 9 — Độ Kiếp để đột phá đại cảnh giới!"
          : "Online nhận 100% tu vi mỗi chu thiên. Offline vẫn tu (50%, tối đa 8 giờ)."}
      </p>
    </section>
  );
}
