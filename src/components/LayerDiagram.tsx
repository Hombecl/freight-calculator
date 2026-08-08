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
