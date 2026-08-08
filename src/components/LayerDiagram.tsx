/**
 * LayerDiagram — top-view SVG of one pallet layer: the exact block
 * arrangement perLayer() counted, so the picture can never disagree with
 * the number. Used by /pallet-calculator and /ti-hi-calculator.
 */

interface Props {
  cartonL: number; // cm
  cartonW: number; // cm
  palletL: number; // cm
  palletW: number; // cm
  label?: string;
}

/** Side elevation: the stack seen from the long side — layers × carton height
 *  on a pallet base, with the load-height limit drawn as a line. */
export function SideDiagram({ cartonL, cartonW, cartonH, palletL, palletW, layers, maxH, label }: Props & { cartonH: number; layers: number; maxH: number }) {
  const a = Math.floor(palletL / cartonL) * Math.floor(palletW / cartonW);
  const b = Math.floor(palletL / cartonW) * Math.floor(palletW / cartonL);
  const cl = a >= b ? cartonL : cartonW; // dimension seen along the pallet length
  const cols = Math.floor(palletL / cl + 1e-6);
  if (cols === 0 || layers === 0) return null;

  const PALLET_H = 14.5;
  const W = 260;
  const s = W / palletL;
  const stackH = layers * cartonH;
  const H = (Math.max(stackH, maxH) + PALLET_H) * s;
  const pad = 6;
  const yBase = pad + H; // bottom of pallet

  const boxes = [];
  for (let r = 0; r < layers; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push(
        <rect key={`${r}-${c}`} x={pad + c * cl * s + 1} y={yBase - PALLET_H * s - (r + 1) * cartonH * s + 1}
          width={cl * s - 2} height={cartonH * s - 2} rx={2} className="fill-blue-200 stroke-blue-500" strokeWidth={1} />,
      );
    }
  }
  const yLimit = yBase - (PALLET_H + maxH) * s;

  return (
    <svg viewBox={`0 0 ${W + pad * 2} ${H + pad * 2 + 4}`} className="w-full max-w-[280px]" role="img" aria-label={label ?? `Side view: ${layers} layers`}>
      {/* pallet base with stringer gaps */}
      <rect x={pad} y={yBase - PALLET_H * s} width={W} height={PALLET_H * s} rx={2} className="fill-amber-200 stroke-amber-500" strokeWidth={1.2} />
      {[0.22, 0.5, 0.78].map((f) => (
        <rect key={f} x={pad + W * f - 6} y={yBase - PALLET_H * s * 0.62} width={12} height={PALLET_H * s * 0.55} className="fill-white" />
      ))}
      {boxes}
      {/* max load height line */}
      <line x1={pad} y1={yLimit} x2={pad + W} y2={yLimit} className="stroke-red-400" strokeWidth={1} strokeDasharray="4 3" />
      <text x={pad + W - 2} y={yLimit - 3} textAnchor="end" className="fill-red-400" fontSize={8.5}>max {Math.round(maxH)} cm</text>
    </svg>
  );
}

export default function LayerDiagram({ cartonL, cartonW, palletL, palletW, label }: Props) {
  // same two block orientations as perLayer(); draw the winning one
  const a = Math.floor(palletL / cartonL) * Math.floor(palletW / cartonW);
  const b = Math.floor(palletL / cartonW) * Math.floor(palletW / cartonL);
  const [cl, cw] = a >= b ? [cartonL, cartonW] : [cartonW, cartonL];
  const cols = Math.floor(palletL / cl);
  const rows = Math.floor(palletW / cw);
  if (cols * rows === 0) return null;

  const W = 260;
  const s = W / palletL;
  const H = palletW * s;
  const pad = 6;

  const boxes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push(
        <rect
          key={`${r}-${c}`}
          x={pad + c * cl * s + 1}
          y={pad + r * cw * s + 1}
          width={cl * s - 2}
          height={cw * s - 2}
          rx={2}
          className="fill-blue-200 stroke-blue-500"
          strokeWidth={1}
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`}
      className="w-full max-w-[280px]"
      role="img"
      aria-label={label ?? `Layer pattern: ${cols} × ${rows} cartons`}
    >
      {/* pallet deck with board lines */}
      <rect x={pad} y={pad} width={W} height={H} rx={3} className="fill-amber-100 stroke-amber-500" strokeWidth={1.5} />
      {[0.2, 0.4, 0.6, 0.8].map((f) => (
        <line key={f} x1={pad} y1={pad + H * f} x2={pad + W} y2={pad + H * f} className="stroke-amber-300" strokeWidth={0.5} />
      ))}
      {boxes}
      {/* leftover strips, hatched feel via low opacity */}
      {palletL - cols * cl > 1 && (
        <rect x={pad + cols * cl * s} y={pad} width={(palletL - cols * cl) * s} height={H} className="fill-amber-500/10" />
      )}
      {palletW - rows * cw > 1 && (
        <rect x={pad} y={pad + rows * cw * s} width={cols * cl * s} height={(palletW - rows * cw) * s} className="fill-amber-500/10" />
      )}
    </svg>
  );
}
