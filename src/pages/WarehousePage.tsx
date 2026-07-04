import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import { autoArrangeFloor, checkReachability, type FloorItemSpec } from '../lib/warehouse';
import { captureLead } from '../lib/entitlement';
import { track } from '../lib/track';

/**
 * WarehousePage — Phase 0 warehouse floor planner (beta).
 * The rule containers don't have: you cannot pack a warehouse solid. Every
 * pallet must stay reachable by a forklift from the dock — the engine
 * flood-fills the aisle network at the chosen forklift width and paints
 * anything cut off red, live, as you drag.
 */

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xa78bfa, 0xf472b6];

const AISLES = [
  { label: 'Counterbalance forklift · 3.5 m', value: 350 },
  { label: 'Compact forklift · 3.0 m', value: 300 },
  { label: 'Reach truck · 2.7 m', value: 270 },
];

const DEFAULT_ITEMS: FloorItemSpec[] = [
  { id: 'eur', label: 'EUR pallet', l: 120, w: 80, h: 150, qty: 40, color: PALETTE[0] },
  { id: 'gma', label: 'GMA pallet', l: 122, w: 102, h: 150, qty: 20, color: PALETTE[1] },
  { id: 'rack', label: 'Rack block', l: 270, w: 110, h: 300, qty: 4, color: PALETTE[3] },
];

export default function WarehousePage() {
  const [floorL, setFloorL] = useState(2000); // cm
  const [floorW, setFloorW] = useState(1200);
  const [aisle, setAisle] = useState(300);
  const [items, setItems] = useState<FloorItemSpec[]>(DEFAULT_ITEMS);
  const [seed, setSeed] = useState(0);
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);

  const floor = useMemo(() => ({ l: floorL, w: floorW }), [floorL, floorW]);
  const arranged = useMemo(
    () => autoArrangeFloor(floor, items, aisle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, floorL, floorW],
  );
  const boxes = liveBoxes ?? arranged;
  const reach = useMemo(() => checkReachability(floor, boxes, aisle), [floor, boxes, aisle]);

  const totalQty = items.reduce((s, x) => s + x.qty, 0);
  const regen = () => { setLiveBoxes(null); setSeed((n) => n + 1); track('warehouse_arrange'); };

  const updateItem = (id: string, patch: Partial<FloorItemSpec>) =>
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addItem = () =>
    setItems((prev) => [...prev, {
      id: `w${prev.length}-${Date.now()}`, label: `Block ${prev.length + 1}`,
      l: 120, w: 100, h: 150, qty: 10, color: PALETTE[prev.length % PALETTE.length],
    }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));

  // beta waitlist
  const [whEmail, setWhEmail] = useState('');
  const [whDone, setWhDone] = useState(false);
  const joinWaitlist = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(whEmail)) return;
    captureLead(whEmail.trim(), { proWaitlist: true, source: 'warehouse-beta' });
    track('waitlist_warehouse');
    setWhDone(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Helmet>
        <title>Warehouse Floor Planner (Beta) — pallets, aisles & forklift reachability | DimPack3D</title>
        <meta name="description" content="Plan a warehouse floor in 3D: auto-arrange pallet rows with forklift aisles, drag anything, and see instantly when a pallet becomes unreachable from the dock. Free beta." />
      </Helmet>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Warehouse Floor Planner</h1>
        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">Beta</span>
      </div>
      <p className="text-slate-500 text-sm -mt-3 mb-5 max-w-2xl">
        The rule containers don't have: a warehouse can't be packed solid. Drag pallets freely — anything a forklift
        can no longer reach from the dock turns <span className="text-red-500 font-semibold">red</span>.
      </p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* left: inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Floor (cm)</label>
            <div className="flex gap-2">
              <input type="number" min={500} value={floorL} onChange={(e) => { setFloorL(Math.max(500, +e.target.value || 0)); setLiveBoxes(null); }}
                className="w-full text-sm px-2 py-1.5 rounded border border-slate-200" />
              <span className="text-slate-400 self-center">×</span>
              <input type="number" min={500} value={floorW} onChange={(e) => { setFloorW(Math.max(500, +e.target.value || 0)); setLiveBoxes(null); }}
                className="w-full text-sm px-2 py-1.5 rounded border border-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{(floorL / 100).toFixed(0)} m × {(floorW / 100).toFixed(0)} m · dock on the green edge</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Forklift aisle width</label>
            <select value={aisle} onChange={(e) => setAisle(+e.target.value)} className="w-full text-sm px-2 py-1.5 rounded border border-slate-200">
              {AISLES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Floor items (cm)</span>
              <button onClick={addItem} className="text-xs text-blue-600 font-medium">+ Add</button>
            </div>
            {items.map((s) => (
              <div key={s.id} className="p-2 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: `#${s.color.toString(16).padStart(6, '0')}` }} />
                  <input value={s.label} onChange={(e) => updateItem(s.id, { label: e.target.value })} className="flex-1 text-sm font-medium bg-transparent outline-none" />
                  <button onClick={() => removeItem(s.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['l', 'w', 'h', 'qty'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] uppercase text-slate-400">{k}</label>
                      <input type="number" min={1} value={s[k]} onChange={(e) => updateItem(s.id, { [k]: Math.max(1, +e.target.value || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={regen} className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
            Auto-arrange with aisles
          </button>

          <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            <div className="flex justify-between"><span>Placed</span><span className="font-semibold">{boxes.length} / {totalQty}</span></div>
            <div className="flex justify-between"><span>Floor coverage</span><span className="font-semibold">{reach.floorUtil.toFixed(1)}%</span></div>
            <div className="flex justify-between items-center">
              <span>Forklift access</span>
              {reach.unreachable.length === 0 ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={14} /> all reachable</span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-red-600"><AlertTriangle size={14} /> {reach.unreachable.length} cut off</span>
              )}
            </div>
            {reach.unreachable.length > 0 && (
              <p className="text-xs text-red-500">Red items can't be reached from the dock with a {(aisle / 100).toFixed(1)} m aisle — clear a path or widen the aisle.</p>
            )}
          </div>

          {/* beta waitlist */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
            {whDone ? (
              <p className="text-xs font-semibold text-emerald-700">Thanks — we'll email you as warehouse features ship.</p>
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-2 font-medium">Beta — racking levels, zones & multi-dock are coming. Want them?</p>
                <div className="flex gap-1.5">
                  <input type="email" value={whEmail} onChange={(e) => setWhEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinWaitlist()}
                    placeholder="you@company.com" className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500" />
                  <button onClick={joinWaitlist} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold">Notify me</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* right: 3D floor */}
        <div>
          <InteractiveLoadPlanner
            key={`${floorL}-${floorW}-${seed}`}
            container={{ l: floorL, w: floorW, h: 350 }}
            boxes={arranged}
            grid={10}
            unitLabel="cm"
            showDoor
            flagIds={reach.unreachable}
            onChange={setLiveBoxes}
          />
          <p className="text-xs text-slate-400 mt-2">
            Green face = dock. Drag any pallet — reachability re-checks live. Grid snap: 10 cm.
          </p>
        </div>
      </div>
    </div>
  );
}
