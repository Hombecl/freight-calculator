import { useState } from "react";
import type { PalletEstimate } from "../lib/palletEstimate";

/** Functional isometric diagram of the exact solver coordinates; no external graphics runtime. */
export default function PalletEstimateView({
  result,
  zh,
}: {
  result: PalletEstimate;
  zh: boolean;
}) {
  const [turn, setTurn] = useState(false);
  const [cut, setCut] = useState(100);
  const [selected, setSelected] = useState<string | null>(null);
  const p = result.pallet;
  const L = turn ? p.w : p.l,
    W = turn ? p.l : p.w;
  const scale = Math.min(
    440 / (L + W),
    260 / (result.loadedHeight + (L + W) * 0.3)
  );
  const point = (x: number, y: number, z: number) => [
    270 + (x - z) * scale,
    320 - y * scale - (L + W - x - z) * scale * 0.3,
  ];
  const poly = (pts: number[][]) => pts.map((pt) => pt.join(",")).join(" ");
  const cuboid = (
    id: string,
    x: number,
    y: number,
    z: number,
    l: number,
    h: number,
    w: number,
    color: string,
    label: string,
    interactive: boolean
  ) => {
    const A = point(x, y + h, z),
      B = point(x + l, y + h, z),
      C = point(x + l, y + h, z + w),
      D = point(x, y + h, z + w);
    const E = point(x + l, y, z),
      F = point(x + l, y, z + w),
      G = point(x, y, z + w);
    return (
      <g
        key={id}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? label : undefined}
        onClick={() => interactive && setSelected(id)}
        onKeyDown={(e) => {
          if (interactive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setSelected(id);
          }
        }}
        className={
          interactive
            ? "cursor-pointer focus:outline-none focus:[&>polygon]:stroke-slate-900 focus:[&>polygon]:stroke-[3px]"
            : ""
        }
        stroke={selected === id ? "#0f172a" : "#ffffff"}
        strokeWidth={selected === id ? 2.5 : 0.8}
      >
        <title>{label}</title>
        <polygon points={poly([B, C, F, E])} fill={color} />
        <polygon
          points={poly([D, C, F, G])}
          fill={color}
          style={{ filter: "brightness(.78)" }}
        />
        <polygon
          points={poly([A, B, C, D])}
          fill={color}
          style={{ filter: "brightness(1.2)" }}
        />
      </g>
    );
  };
  const visible = result.boxes
    .filter((b) => b.py < (result.cargoHeight * cut) / 100 + 0.001)
    .map((b) => ({
      ...b,
      x: turn ? b.pz : b.px,
      z: turn ? p.l - b.px - b.l : b.pz,
      length: turn ? b.w : b.l,
      width: turn ? b.l : b.w,
    }))
    .sort((a, b) => a.py - b.py || a.x + a.z - (b.x + b.z));
  const chosen = result.boxes.find((b) => b.id === selected);
  return (
    <div>
      <div className="flex justify-between items-center px-5 pt-4 gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {zh ? "實際擺位 · 點選紙箱查看" : "Placement view · select a carton"}
        </p>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
          onClick={() => setTurn(!turn)}
        >
          {zh ? "轉換角度" : "Turn view"}
        </button>
      </div>
      <svg
        viewBox="0 0 540 350"
        className="w-full max-h-[390px]"
        aria-label={
          zh
            ? "卡板與紙箱的互動擺位圖"
            : "Interactive pallet and carton placement diagram"
        }
      >
        <defs>
          <pattern
            id="pallet-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth=".6"
            />
          </pattern>
        </defs>
        <rect width="540" height="350" fill="url(#pallet-grid)" />
        {cuboid(
          "base",
          0,
          0,
          0,
          L,
          p.baseHeight,
          W,
          "#b58a59",
          zh ? "卡板底座" : "Pallet base",
          false
        )}
        {visible.map((b) =>
          cuboid(
            b.id,
            b.x,
            p.baseHeight + b.py,
            b.z,
            b.length,
            b.h,
            b.width,
            `#${b.color.toString(16).padStart(6, "0")}`,
            `${b.label}: ${b.l} × ${b.w} × ${b.h} cm`,
            true
          )
        )}
      </svg>
      <div className="px-5 pb-5 space-y-3">
        <label className="block text-sm text-slate-600">
          {zh ? "逐層查看" : "Reveal the stack"}{" "}
          <span className="float-right tabular-nums">{Math.round(cut)}%</span>
          <input
            aria-label={zh ? "顯示堆疊高度" : "Visible stack height"}
            type="range"
            min="1"
            max="100"
            value={cut}
            onChange={(e) => setCut(+e.target.value)}
            className="w-full accent-blue-600 mt-2"
          />
        </label>
        <p className="text-sm text-slate-500 min-h-5" aria-live="polite">
          {chosen
            ? `${chosen.label} · ${chosen.l} × ${chosen.w} × ${chosen.h} cm · ${chosen.weight} kg`
            : zh
            ? "擺位高度由板面起計；結果包含底座高度。"
            : "Carton positions start at the deck; the height result includes the base."}
        </p>
      </div>
    </div>
  );
}
