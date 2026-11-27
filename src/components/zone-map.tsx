"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SEQ } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { LGA_SHAPES, MAP_H, MAP_W, STATE_PATH, ZONE_SHAPES } from "@/lib/geo/ogun-map";

/* Illustrated Ogun State board: paper land, soft printed place names, office pins.
   HQ mode — every zone is clickable and tinted by the chosen metric.
   Zone mode — only the officer's own zone is lit; the rest of the state recedes. */

type VB = [number, number, number, number];
const FULL: VB = [0, 0, MAP_W, MAP_H];
const LABEL_NUDGE: Record<string, [number, number]> = { abs: [0, 22], ijo: [10, 16], ikn: [0, -6], odo: [-6, 10], ago: [8, -6], ije: [10, 0] };
const SHORT: Record<string, string> = { ije: "Ijebu East", abs: "Abeokuta S.", abn: "Abeokuta North" };

export interface ZoneMapProps {
  mode: "hq" | "zone";
  selected: string | null;
  onSelect?: (id: string | null) => void;
  values?: Record<string, number>;
  format?: (n: number) => string;
  metricLabel?: string;
  ownZone?: string;
  height?: number;
  /** HQ mode: zoom the board to the selected zone (default true). */
  zoomOnSelect?: boolean;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function fitBox(b: readonly number[], pad = 0.35, maxZoom = 2.8): VB {
  const [x, y, w, h] = b;
  const aspect = MAP_W / MAP_H;
  let bw = w * (1 + pad * 2);
  let bh = h * (1 + pad * 2);
  if (bw / bh > aspect) bh = bw / aspect;
  else bw = bh * aspect;
  const minW = MAP_W / maxZoom;
  if (bw < minW) {
    bw = minW;
    bh = minW / aspect;
  }
  return [x + w / 2 - bw / 2, y + h / 2 - bh / 2, bw, bh];
}

export function ZoneMap({ mode, selected, onSelect, values, format, metricLabel, ownZone, height, zoomOnSelect = true }: ZoneMapProps) {
  const focusZone = mode === "zone" ? ownZone : selected;
  const zoomZone = mode === "zone" || zoomOnSelect ? focusZone : null;
  const target = useMemo<VB>(() => {
    const z = ZONE_SHAPES.find((s) => s.id === zoomZone);
    return z ? fitBox(z.bbox, mode === "zone" ? 0.55 : 0.6, mode === "zone" ? 2.4 : 1.9) : FULL;
  }, [zoomZone, mode]);
  const [manual, setManual] = useState<number>(1);
  const [vb, setVb] = useState<VB>(target);
  const cur = useRef<VB>(vb);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // animate viewBox toward target (with manual zoom factor)
  useEffect(() => {
    const [tx, ty, tw, th] = target;
    const k = manual;
    const goal: VB = [tx + (tw - tw / k) / 2, ty + (th - th / k) / 2, tw / k, th / k];
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 650);
      const e = ease(t);
      const next = from.map((v, i) => v + (goal[i] - v) * e) as VB;
      cur.current = next;
      setVb(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, manual]);
  useEffect(() => setManual(1), [zoomZone]);

  const scale = MAP_W / vb[2]; // >1 when zoomed in
  const ui = 1 / scale; // keep strokes/labels constant on screen

  // sequential tint by quantile
  const fillFor = useMemo(() => {
    if (!values) return () => "var(--map-land)";
    const vs = Object.values(values).sort((a, b) => a - b);
    const lo = vs[0] ?? 0;
    const hi = vs[vs.length - 1] ?? 1;
    return (id: string) => {
      const v = values[id] ?? 0;
      const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
      return SEQ[Math.min(SEQ.length - 1, 1 + Math.round(t * (SEQ.length - 3)))];
    };
  }, [values]);

  const isLit = (id: string) => (mode === "zone" ? id === ownZone : !selected || id === selected);
  const hz = hover ? ZONE_SHAPES.find((z) => z.id === hover.id) : null;

  return (
    <div ref={wrap} className="relative overflow-hidden rounded-2xl bg-[var(--map-sea)]" style={{ height: height ?? "auto", aspectRatio: height ? undefined : `${MAP_W} / ${MAP_H}` }}>
      <svg
        viewBox={vb.join(" ")}
        className="h-full w-full select-none"
        role="img"
        aria-label="Map of Ogun State planning zones"
        onClick={() => mode === "hq" && onSelect?.(null)}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="paper-dots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.7" fill="#c9bfa6" opacity="0.35" />
          </pattern>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#cfc6b0" strokeWidth="1" opacity="0.5" />
          </pattern>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy={3 * ui} stdDeviation={5 * ui} floodColor="#2b3a2f" floodOpacity="0.22" />
          </filter>
          <filter id="land-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#3d4a3c" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* sea / neighbours */}
        <rect x={-400} y={-400} width={MAP_W + 800} height={MAP_H + 800} fill="url(#hatch)" opacity={0.55} />
        <g fontFamily="var(--font-satoshi)" fill="#b3b8ae" fontWeight={600} fontSize={13 * Math.max(ui, 0.6)} letterSpacing={3} pointerEvents="none">
          <text x={MAP_W * 0.42} y={MAP_H - 18}>LAGOS STATE</text>
          <text x={MAP_W * 0.52} y={34}>OYO STATE</text>
          <text x={MAP_W - 70} y={MAP_H * 0.28} textAnchor="middle" transform={`rotate(90 ${MAP_W - 70} ${MAP_H * 0.28})`}>ONDO STATE</text>
          <text x={14} y={MAP_H * 0.78} transform={`rotate(-90 14 ${MAP_H * 0.78})`}>REP. OF BENIN</text>
        </g>

        {/* land */}
        <path d={STATE_PATH} fill="var(--map-land)" filter="url(#land-shadow)" />
        <path d={STATE_PATH} fill="url(#paper-dots)" pointerEvents="none" />

        {/* zones */}
        {ZONE_SHAPES.map((z) => {
          const lit = isLit(z.id);
          const sel = (mode === "hq" && selected === z.id) || (mode === "zone" && ownZone === z.id);
          const fill = sel ? "var(--brand)" : mode === "zone" ? "#e2e7df" : fillFor(z.id);
          const interactive = mode === "hq";
          return (
            <path
              key={z.id}
              d={z.d}
              className={cx("zone-shape", interactive && "cursor-pointer")}
              fill={fill}
              opacity={lit ? 1 : mode === "zone" ? 0.85 : 0.45}
              stroke={sel ? "var(--brand-strong)" : "#ffffff"}
              strokeWidth={(sel ? 2.6 : 1.4) * ui}
              strokeLinejoin="round"
              filter={sel ? "url(#lift)" : undefined}
              onClick={(e) => {
                if (!interactive) return;
                e.stopPropagation();
                onSelect?.(selected === z.id ? null : z.id);
              }}
              onMouseMove={(e) => {
                const r = wrap.current?.getBoundingClientRect();
                if (r) setHover({ id: z.id, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
            >
              <title>{z.name}</title>
            </path>
          );
        })}

        {/* LGA boundaries — faint dashes inside zones */}
        <g pointerEvents="none" fill="none" stroke="#8f8a78" strokeOpacity={0.35} strokeWidth={0.7 * ui} strokeDasharray={`${3 * ui} ${3 * ui}`}>
          {LGA_SHAPES.map((l) => (
            <path key={l.name} d={l.d} />
          ))}
        </g>
        {/* state outline */}
        <path d={STATE_PATH} fill="none" stroke="#6f6a58" strokeOpacity={0.55} strokeWidth={1.4 * ui} pointerEvents="none" />
        {/* re-stroke selected zone above others */}
        {ZONE_SHAPES.filter((z) => z.id === focusZone).map((z) => (
          <path key={`sel-${z.id}`} d={z.d} fill="none" stroke="var(--brand-strong)" strokeWidth={2.4 * ui} strokeLinejoin="round" pointerEvents="none" />
        ))}

        {/* office pins */}
        {ZONE_SHAPES.map((z) => {
          const lit = isLit(z.id);
          const sel = z.id === focusZone;
          const [x, y] = z.officeXY;
          const s = (sel ? 1.15 : 0.8) * ui;
          if (!lit && mode === "zone") return null;
          return (
            <g key={`pin-${z.id}`} transform={`translate(${x} ${y})`} pointerEvents="none" opacity={lit ? 1 : 0.5}>
              {sel && <circle r={10 * ui} cy={-17 * s} fill="#9be3b9" className="map-ping" />}
              <ellipse cx={0} cy={1 * s} rx={5.5 * s} ry={1.8 * s} fill="#2f2a1c" opacity={0.25} />
              <g transform={`scale(${s})`}>
                <path d="M0 0 C-2 -6 -9 -10 -9 -17 A9 9 0 1 1 9 -17 C9 -10 2 -6 0 0 Z" fill={sel ? "#ffffff" : "var(--brand-strong)"} stroke={sel ? "var(--brand-strong)" : "#ffffff"} strokeWidth={1.6} />
                <circle cy={-17} r={3.8} fill={sel ? "var(--bronze)" : "#ffffff"} />
              </g>
            </g>
          );
        })}

        {/* soft printed zone names */}
        {ZONE_SHAPES.map((z) => {
          const lit = isLit(z.id);
          const [nx, ny] = LABEL_NUDGE[z.id] ?? [0, 0];
          const sel = z.id === focusZone;
          const name = (scale < 1.3 && SHORT[z.id]) || z.name;
          return (
            <text
              key={`lbl-${z.id}`}
              x={z.label[0] + nx}
              y={z.label[1] + ny + 16}
              textAnchor="middle"
              fontFamily="var(--font-satoshi)"
              fontSize={(sel ? 11.5 : 9.5) * ui}
              fontWeight={700}
              letterSpacing={0.9 * ui}
              fill={sel ? "#ffffff" : lit ? "#3f4a42" : "#8a948c"}
              stroke={sel ? "var(--brand-strong)" : "#f7f8f5"}
              strokeOpacity={0.92}
              strokeWidth={3.2 * ui}
              strokeLinejoin="round"
              paintOrder="stroke"
              pointerEvents="none"
            >
              {name.toUpperCase()}
            </text>
          );
        })}

        {/* compass */}
        <g transform={`translate(${vb[0] + vb[2] - 44 * ui} ${vb[1] + 50 * ui}) scale(${ui})`} pointerEvents="none" opacity={0.7}>
          <circle r={18} fill="#fbf6ea" stroke="#b9ae92" strokeWidth={1} />
          <path d="M0 -14 L4 0 L0 14 L-4 0 Z" fill="#b9ae92" />
          <path d="M0 -14 L4 0 L-4 0 Z" fill="var(--bronze)" />
          <text y={-21} textAnchor="middle" fontSize={9} fontWeight={700} fill="#7d7258" fontFamily="var(--font-satoshi)">
            N
          </text>
        </g>
      </svg>

      {/* hover card */}
      {hz && hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface/95 px-3 py-2 shadow-lg backdrop-blur"
          style={{ left: Math.min(hover.x + 14, (wrap.current?.clientWidth ?? 600) - 190), top: Math.max(8, hover.y - 54) }}
        >
          <div className="text-[12.5px] font-semibold text-ink">{hz.name} ZPO</div>
          <div className="text-[11px] text-ink-3">{hz.lgas.join(", ")}</div>
          {values && format && (
            <div className="mt-1 text-[12px] text-ink-2">
              {metricLabel}: <span className="font-semibold text-ink tnum">{format(values[hz.id] ?? 0)}</span>
            </div>
          )}
        </div>
      )}

      {/* controls */}
      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-lg border border-line bg-surface/90 shadow-sm backdrop-blur">
        <button className="p-1.5 text-ink-2 hover:bg-surface-2" onClick={() => setManual((m) => Math.min(4, m * 1.35))} aria-label="Zoom in">
          <Plus className="size-4" />
        </button>
        <button className="border-t border-line p-1.5 text-ink-2 hover:bg-surface-2" onClick={() => setManual((m) => Math.max(0.8, m / 1.35))} aria-label="Zoom out">
          <Minus className="size-4" />
        </button>
        <button
          className="border-t border-line p-1.5 text-ink-2 hover:bg-surface-2"
          onClick={() => {
            setManual(1);
            if (mode === "hq") onSelect?.(null);
          }}
          aria-label="Reset view"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* legend */}
      {mode === "hq" && values && format && (
        <div className="absolute bottom-3 left-3 rounded-lg border border-line bg-surface/90 px-3 py-2 shadow-sm backdrop-blur">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">{metricLabel}</div>
          <div className="flex items-center gap-2 text-[10.5px] text-ink-3 tnum">
            <span>{format(Math.min(...Object.values(values)))}</span>
            <div className="flex">
              {SEQ.slice(1, -1).map((c) => (
                <span key={c} className="h-2 w-4 first:rounded-l last:rounded-r" style={{ background: c }} />
              ))}
            </div>
            <span>{format(Math.max(...Object.values(values)))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
