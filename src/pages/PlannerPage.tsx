import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import InteractiveLoadPlanner, { PlannerBox, utilizationOf } from '../components/InteractiveLoadPlanner';

/**
 * PlannerPage — the interactive load-planning workspace.
 *
 * Container tools elsewhere in the app compute a FIXED optimal layout. This page
 * adds the missing half: an editable 3D plan. We seed it with a greedy first-fit
 * auto-arrange, then hand control to the user (drag / rotate / stack).
 */

interface BoxSpec {
  id: string;
  label: string;
  l: number;
  w: number;
  h: number;
  qty: number;
  color: number;
}

const CONTAINERS = {
  '20gp': { label: "20' GP", l: 589, w: 235, h: 239 },
  '40gp': { label: "40' GP", l: 1203, w: 235, h: 239 },
  '40hq': { label: "40' HQ", l: 1203, w: 235, h: 269 },
} as const;
type ContainerKey = keyof typeof CONTAINERS;

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xf472b6, 0xa78bfa, 0xf87171];

const DEFAULT_SPECS: BoxSpec[] = [
  { id: 's1', label: 'Carton A', l: 60, w: 40, h: 40, qty: 20, color: PALETTE[0] },
  { id: 's2', label: 'Carton B', l: 50, w: 30, h: 30, qty: 16, color: PALETTE[1] },
];

/** Greedy first-fit: fill the floor row by row, then start a new layer on top. */
function autoArrange(container: { l: number; w: number; h: number }, specs: BoxSpec[]): PlannerBox[] {
  const boxes: PlannerBox[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let cursorY = 0;
  let rowDepth = 0; // max w in the current row
  let layerHeight = 0; // max h in current layer
  let n = 0;

  const queue: BoxSpec[] = [];
  specs.forEach((s) => { for (let i = 0; i < s.qty; i++) queue.push(s); });

  for (const s of queue) {
    if (s.l > container.l || s.w > container.w || s.h > container.h) continue;
    // new row if this box won't fit along X
    if (cursorX + s.l > container.l + 1e-6) {
      cursorX = 0;
      cursorZ += rowDepth;
      rowDepth = 0;
    }
    // new layer if this row won't fit along Z
    if (cursorZ + s.w > container.w + 1e-6) {
      cursorZ = 0;
      cursorX = 0;
      cursorY += layerHeight;
      layerHeight = 0;
      rowDepth = 0;
    }
    // out of height — stop packing
    if (cursorY + s.h > container.h + 1e-6) break;

    boxes.push({
      id: `${s.id}-${n++}`,
      label: s.label,
      l: s.l, w: s.w, h: s.h,
      px: cursorX, py: cursorY, pz: cursorZ,
      color: s.color,
    });
    cursorX += s.l;
    rowDepth = Math.max(rowDepth, s.w);
    layerHeight = Math.max(layerHeight, s.h);
  }
  return boxes;
}

export default function PlannerPage() {
  const [containerKey, setContainerKey] = useState<ContainerKey>('20gp');
  const [specs, setSpecs] = useState<BoxSpec[]>(DEFAULT_SPECS);
  const [seed, setSeed] = useState(0); // bump to re-run auto-arrange

  const container = CONTAINERS[containerKey];
  const boxes = useMemo(
    () => autoArrange(container, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerKey, seed],
  );

  const packedQty = boxes.length;
  const totalQty = specs.reduce((s, x) => s + x.qty, 0);
  const util = utilizationOf(boxes, container);

  const updateSpec = (id: string, patch: Partial<BoxSpec>) =>
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSpec = () =>
    setSpecs((prev) => [
      ...prev,
      {
        id: `s${prev.length + 1}-${Date.now()}`,
        label: `Carton ${String.fromCharCode(65 + prev.length)}`,
        l: 40, w: 30, h: 30, qty: 8,
        color: PALETTE[prev.length % PALETTE.length],
      },
    ]);

  const removeSpec = (id: string) => setSpecs((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Helmet>
        <title>Interactive 3D Load Planner | DimPack3D</title>
        <meta
          name="description"
          content="Auto-arrange cartons into a shipping container, then drag, rotate and stack them by hand in an interactive 3D editor. Free load planning from DimPack3D."
        />
        <link rel="canonical" href="https://www.dimpack3d.com/planner" />
      </Helmet>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Interactive 3D Load Planner</h1>
        <p className="text-slate-500 text-sm mt-1">
          Auto-pack a container, then fine-tune the plan by hand — drag, rotate and stack every carton.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* left: inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Container</label>
            <div className="flex gap-1">
              {(Object.keys(CONTAINERS) as ContainerKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setContainerKey(k)}
                  className={`flex-1 px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                    containerKey === k ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {CONTAINERS[k].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {container.l} × {container.w} × {container.h} cm
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Carton types (cm)</span>
              <button onClick={addSpec} className="text-xs text-blue-600 font-medium">+ Add</button>
            </div>
            {specs.map((s) => (
              <div key={s.id} className="p-2 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: `#${s.color.toString(16).padStart(6, '0')}` }} />
                  <input
                    value={s.label}
                    onChange={(e) => updateSpec(s.id, { label: e.target.value })}
                    className="flex-1 text-sm font-medium bg-transparent outline-none"
                  />
                  <button onClick={() => removeSpec(s.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['l', 'w', 'h', 'qty'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] uppercase text-slate-400">{k}</label>
                      <input
                        type="number"
                        min={1}
                        value={s[k]}
                        onChange={(e) => updateSpec(s.id, { [k]: Math.max(1, Number(e.target.value) || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSeed((n) => n + 1)}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
          >
            Auto-arrange
          </button>

          <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            <div className="flex justify-between"><span>Packed</span><span className="font-semibold">{packedQty} / {totalQty}</span></div>
            <div className="flex justify-between"><span>Volume utilization</span><span className="font-semibold">{util.toFixed(1)}%</span></div>
            {packedQty < totalQty && (
              <p className="text-xs text-amber-600">Not everything fits — {totalQty - packedQty} carton(s) left out.</p>
            )}
          </div>
        </div>

        {/* right: 3D editor */}
        <div>
          <InteractiveLoadPlanner
            key={`${containerKey}-${seed}`}
            container={container}
            boxes={boxes}
            grid={1}
            unitLabel="cm"
          />
        </div>
      </div>
    </div>
  );
}
