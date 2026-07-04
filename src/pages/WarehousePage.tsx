import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, CheckCircle2, Route, Share2, FileText, Save, Check } from 'lucide-react';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import {
  autoArrangeFloorD, checkReachabilityD, forkliftPathD, placeNearDockD,
  positionCapacity, type FloorItemSpec, type DockEdge,
} from '../lib/warehouse';
import { captureLead } from '../lib/entitlement';
import { track } from '../lib/track';
import { savePlan, getPlan } from '../lib/plans';
import { openWarehousePrintable } from '../lib/exportPlan';
import { useAuth } from '../hooks/useAuth';

/**
 * WarehousePage — production warehouse floor planner.
 * Cargo auto-arranges into aisle rows; racks and obstacles (walls, columns,
 * office) are placed by hand and block the forklift network without being
 * flagged themselves. The dock can sit on any of the four edges. Live
 * reachability paints cut-off storage red; clicking anything shows the
 * forklift's real route and clearance band.
 */

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xa78bfa, 0xf472b6];
const KIND_COLORS: Record<string, number> = { rack: 0x8b5cf6, obstacle: 0x64748b };

const AISLES = [
  { label: 'Counterbalance forklift · 3.5 m', value: 350 },
  { label: 'Compact forklift · 3.0 m', value: 300 },
  { label: 'Reach truck · 2.7 m', value: 270 },
];

const DOCKS: { key: DockEdge; label: string }[] = [
  { key: 'E', label: 'Right' },
  { key: 'W', label: 'Left' },
  { key: 'S', label: 'Front' },
  { key: 'N', label: 'Back' },
];

const DEFAULT_ITEMS: FloorItemSpec[] = [
  { id: 'eur', label: 'EUR pallet', l: 120, w: 80, h: 150, qty: 40, color: PALETTE[0], kind: 'cargo' },
  { id: 'gma', label: 'GMA pallet', l: 122, w: 102, h: 150, qty: 20, color: PALETTE[1], kind: 'cargo' },
  { id: 'rack', label: 'Rack bay', l: 270, w: 110, h: 300, qty: 1, color: KIND_COLORS.rack, kind: 'rack', levels: 4 },
];

const QUICK_ADD: { label: string; spec: Omit<FloorItemSpec, 'id'> }[] = [
  { label: '+ Pallet', spec: { label: 'Pallet', l: 120, w: 80, h: 150, qty: 10, color: PALETTE[0], kind: 'cargo' } },
  { label: '+ Rack', spec: { label: 'Rack bay', l: 270, w: 110, h: 300, qty: 1, color: KIND_COLORS.rack, kind: 'rack', levels: 4 } },
  { label: '+ Column', spec: { label: 'Column', l: 40, w: 40, h: 350, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
  { label: '+ Wall', spec: { label: 'Wall section', l: 400, w: 20, h: 300, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
  { label: '+ Office', spec: { label: 'Office block', l: 500, w: 400, h: 280, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
];

const KIND_CHIP: Record<string, { label: string; cls: string }> = {
  cargo: { label: 'cargo', cls: 'bg-amber-100 text-amber-700' },
  rack: { label: 'rack', cls: 'bg-purple-100 text-purple-700' },
  obstacle: { label: 'structure', cls: 'bg-slate-200 text-slate-600' },
};

const isStructure = (b: PlannerBox) => {
  const k = (b as PlannerBox & { kind?: string }).kind;
  return k === 'rack' || k === 'obstacle';
};

export default function WarehousePage() {
  const [floorL, setFloorL] = useState(2000); // cm
  const [floorW, setFloorW] = useState(1200);
  const [aisle, setAisle] = useState(300);
  const [dock, setDock] = useState<DockEdge>('E');
  const [items, setItems] = useState<FloorItemSpec[]>(DEFAULT_ITEMS);
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);
  const [baseline, setBaseline] = useState<PlannerBox[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const floor = useMemo(() => ({ l: floorL, w: floorW }), [floorL, floorW]);
  const initial = useMemo(
    () => autoArrangeFloorD({ l: 2000, w: 1200 }, DEFAULT_ITEMS, 300, 'E'),
    [],
  );
  const base = baseline ?? initial;
  const boxes = liveBoxes ?? base;
  const reach = useMemo(() => checkReachabilityD(floor, boxes, aisle, dock), [floor, boxes, aisle, dock]);
  const capacity = useMemo(() => positionCapacity(boxes), [boxes]);

  const totalQty = items.filter((i) => (i.kind ?? 'cargo') === 'cargo').reduce((s, x) => s + x.qty, 0);

  /** Re-run the row layout, KEEPING hand-placed racks/obstacles in place. */
  const regen = (dockEdge: DockEdge = dock) => {
    const structures = boxes.filter(isStructure);
    const rows = autoArrangeFloorD(floor, items, aisle, dockEdge, structures);
    setBaseline([...structures, ...rows]);
    setLiveBoxes(null);
    setSelectedId(null);
    track('warehouse_arrange');
  };

  const changeDock = (edge: DockEdge) => { setDock(edge); regen(edge); };

  // forklift route + clearance for the selected item
  const path = useMemo(
    () => (selectedId ? forkliftPathD(floor, boxes, aisle, selectedId, dock) : null),
    [floor, boxes, aisle, selectedId, dock],
  );
  const pathLen = useMemo(() => {
    if (!path || path.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < path.length; i++) len += Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z);
    return len / 100;
  }, [path]);
  const selectedBox = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  useEffect(() => { if (selectedId) track('warehouse_route'); }, [selectedId]);

  // rotating coach tips
  const TIPS = [
    'Click any pallet — the forklift\'s route and clearance band appear.',
    'Drag a pallet across an aisle. Anything cut off turns red instantly.',
    'Place a Wall or Office from the palette — structures block routes but never turn red.',
    'Try the reach-truck aisle width (2.7 m) — watch how much floor you win back.',
  ];
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 7000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Drop ONE unit of a spec near the dock, selected and ready to drag. */
  const placeOne = (spec: FloorItemSpec) => {
    const spot = placeNearDockD(floor, boxes, spec, dock);
    if (!spot) return;
    const nb: PlannerBox & { kind?: string; levels?: number } = {
      id: `${spec.id}-m${Date.now() % 100000}`,
      label: spec.label,
      l: spec.l, w: spec.w, h: spec.h,
      px: spot.px, py: 0, pz: spot.pz,
      color: spec.color,
      kind: spec.kind ?? 'cargo',
      levels: spec.levels,
    };
    setBaseline([...boxes, nb]);
    setLiveBoxes(null);
    setSelectedId(nb.id);
    track('warehouse_place_one', spec.kind ?? 'cargo');
  };

  // example layouts
  const loadExample = (key: 'threepl' | 'crossdock') => {
    if (key === 'threepl') {
      const fl = { l: 2400, w: 1400 };
      setFloorL(fl.l); setFloorW(fl.w); setAisle(300); setDock('E');
      const its: FloorItemSpec[] = [
        { id: 'eur', label: 'EUR pallet', l: 120, w: 80, h: 150, qty: 60, color: PALETTE[0], kind: 'cargo' },
        { id: 'gma', label: 'GMA pallet', l: 122, w: 102, h: 150, qty: 24, color: PALETTE[1], kind: 'cargo' },
        { id: 'rack', label: 'Rack bay', l: 270, w: 110, h: 300, qty: 1, color: KIND_COLORS.rack, kind: 'rack', levels: 4 },
      ];
      setItems(its);
      const racks: (PlannerBox & { kind: string; levels: number })[] = Array.from({ length: 7 }, (_, i) => ({
        id: `rack-${i}`, label: 'Rack bay', l: 270, w: 110, h: 300,
        px: 60 + i * 300, py: 0, pz: fl.w - 120, color: KIND_COLORS.rack, kind: 'rack', levels: 4,
      }));
      const rows = autoArrangeFloorD(fl, its, 300, 'E', racks);
      setBaseline([...racks, ...rows]);
    } else {
      const fl = { l: 1800, w: 1000 };
      setFloorL(fl.l); setFloorW(fl.w); setAisle(350); setDock('E');
      const its: FloorItemSpec[] = [
        { id: 'out', label: 'Outbound pallets', l: 120, w: 80, h: 150, qty: 24, color: PALETTE[0], kind: 'cargo' },
        { id: 'in', label: 'Inbound pallets', l: 122, w: 102, h: 150, qty: 12, color: PALETTE[2], kind: 'cargo' },
      ];
      setItems(its);
      setBaseline(autoArrangeFloorD(fl, its, 350, 'E'));
    }
    setLiveBoxes(null);
    setSelectedId(null);
    track('warehouse_example', key);
  };

  // first-visit tutorial
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !localStorage.getItem('dp_wh_tutorial_seen'); } catch { return true; }
  });
  const dismissTutorial = () => {
    try { localStorage.setItem('dp_wh_tutorial_seen', '1'); } catch { /* ignore */ }
    setShowTutorial(false);
    track('warehouse_tutorial_done');
  };

  const updateItem = (id: string, patch: Partial<FloorItemSpec>) =>
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addOfKind = (spec: Omit<FloorItemSpec, 'id'>) =>
    setItems((prev) => [...prev, { ...spec, id: `w${prev.length}-${Date.now()}` }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));

  // ---- share / save / export ----
  const auth = useAuth();
  const [params] = useSearchParams();
  const snapshotFn = useRef<(() => string | null) | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');

  const applyLoaded = (p: any) => {
    if (!p) return;
    if (p.floor?.l) { setFloorL(p.floor.l); setFloorW(p.floor.w); }
    if (p.aisle) setAisle(p.aisle);
    if (p.dock) setDock(p.dock);
    if (Array.isArray(p.items) && p.items.length) setItems(p.items);
    if (Array.isArray(p.boxes) && p.boxes.length) { setBaseline(p.boxes); setLiveBoxes(null); }
  };

  useEffect(() => {
    const shareId = params.get('share');
    const savedId = params.get('saved');
    if (shareId) {
      fetch(`/api/share?id=${shareId}`).then((r) => (r.ok ? r.json() : null)).then((p) => {
        if (p?.type === 'warehouse') { applyLoaded(p); track('share_open', 'warehouse'); }
      }).catch(() => {});
    } else if (savedId) {
      getPlan(savedId).then((p) => {
        if (p && p.container_key === 'warehouse') {
          const c = p.container as any;
          applyLoaded({ floor: { l: c.l, w: c.w }, aisle: c.aisle, dock: c.dock, items: p.specs, boxes: p.boxes });
          track('saved_open', 'warehouse');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharePlan = async () => {
    setShareState('busy');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'warehouse', floor, aisle, dock, items, boxes }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { id } = await res.json();
      await navigator.clipboard.writeText(`${window.location.origin}/warehouse?share=${id}`);
      track('share_create', 'warehouse');
      setShareState('copied');
    } catch { setShareState('error'); }
    setTimeout(() => setShareState('idle'), 2500);
  };

  const exportPdf = () => {
    track('export_pdf', 'warehouse');
    openWarehousePrintable({
      floor, aisle, dock, boxes,
      stats: { floorUtil: reach.floorUtil, unreachable: reach.unreachable, ...capacity },
      imageDataUrl: snapshotFn.current?.() ?? null,
      date: new Date().toLocaleDateString(),
    });
  };

  const saveToAccount = async () => {
    const name = window.prompt('Layout name:', `Warehouse ${(floorL / 100).toFixed(0)}×${(floorW / 100).toFixed(0)}m · ${new Date().toLocaleDateString()}`);
    if (!name) return;
    setSaveState('busy');
    const { error } = await savePlan({
      name,
      container_key: 'warehouse',
      container: { l: floorL, w: floorW, h: 350, aisle, dock } as any,
      specs: items as any,
      boxes,
      stats: { volumeUtil: reach.floorUtil, totalWeight: 0, placedCount: capacity.floorCargo } as any,
    });
    setSaveState(error ? 'error' : 'saved');
    if (!error) track('plan_saved', 'warehouse');
    setTimeout(() => setSaveState('idle'), 2500);
  };

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
        <title>Warehouse Floor Planner — pallets, racks, aisles & forklift reachability | DimPack3D</title>
        <meta name="description" content="Plan a warehouse floor in 3D: pallet rows with forklift aisles, racks with level capacity, walls and columns, dock on any edge — with live forklift reachability and route simulation. Free." />
      </Helmet>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Warehouse Floor Planner</h1>
        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">Beta</span>
      </div>
      <p className="text-slate-500 text-sm -mt-3 mb-5 max-w-2xl">
        The rule containers don't have: a warehouse can't be packed solid. Anything a forklift
        can no longer reach from the dock turns <span className="text-red-500 font-semibold">red</span> — structures (racks, walls) block routes without turning red themselves.
      </p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* left: inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Floor (cm)</label>
            <div className="flex gap-2">
              <input type="number" min={500} value={floorL} onChange={(e) => { setFloorL(Math.max(500, +e.target.value || 0)); setBaseline(null); setLiveBoxes(null); }}
                className="w-full text-sm px-2 py-1.5 rounded border border-slate-200" />
              <span className="text-slate-400 self-center">×</span>
              <input type="number" min={500} value={floorW} onChange={(e) => { setFloorW(Math.max(500, +e.target.value || 0)); setBaseline(null); setLiveBoxes(null); }}
                className="w-full text-sm px-2 py-1.5 rounded border border-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{(floorL / 100).toFixed(0)} m × {(floorW / 100).toFixed(0)} m</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Dock side <span className="text-slate-400 font-normal">(green edge)</span></label>
            <div className="flex gap-1">
              {DOCKS.map((d) => (
                <button key={d.key} onClick={() => changeDock(d.key)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                    dock === d.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Forklift aisle width</label>
            <select value={aisle} onChange={(e) => setAisle(+e.target.value)} className="w-full text-sm px-2 py-1.5 rounded border border-slate-200">
              {AISLES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="flex gap-1.5">
            <button onClick={() => loadExample('threepl')} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300">
              Example: 3PL floor
            </button>
            <button onClick={() => loadExample('crossdock')} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300">
              Example: Cross-dock
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Palette</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_ADD.map((q) => (
                <button key={q.label} onClick={() => addOfKind(q.spec)}
                  className="px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-blue-300">
                  {q.label}
                </button>
              ))}
            </div>
            {items.map((s) => (
              <div key={s.id} className="p-2 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: `#${s.color.toString(16).padStart(6, '0')}` }} />
                  <input value={s.label} onChange={(e) => updateItem(s.id, { label: e.target.value })} className="flex-1 text-sm font-medium bg-transparent outline-none" />
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${(KIND_CHIP[s.kind ?? 'cargo']).cls}`}>
                    {(KIND_CHIP[s.kind ?? 'cargo']).label}
                  </span>
                  <button onClick={() => removeItem(s.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['l', 'w', 'h'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] uppercase text-slate-400">{k}</label>
                      <input type="number" min={1} value={s[k]} onChange={(e) => updateItem(s.id, { [k]: Math.max(1, +e.target.value || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200" />
                    </div>
                  ))}
                  {(s.kind ?? 'cargo') === 'cargo' ? (
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400">qty</label>
                      <input type="number" min={1} value={s.qty} onChange={(e) => updateItem(s.id, { qty: Math.max(1, +e.target.value || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200" />
                    </div>
                  ) : s.kind === 'rack' ? (
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400">levels</label>
                      <input type="number" min={1} max={10} value={s.levels ?? 4} onChange={(e) => updateItem(s.id, { levels: Math.max(1, +e.target.value || 1) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200" />
                    </div>
                  ) : <div />}
                </div>
                <button
                  onClick={() => placeOne(s)}
                  className="w-full py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  ⤓ Place one near the dock
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => regen()} className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
            Auto-arrange pallets (keeps structures)
          </button>

          <div className="flex gap-2">
            <button onClick={sharePlan} disabled={shareState === 'busy'}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                shareState === 'copied' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}>
              {shareState === 'copied' ? (<><Check size={14} /> Copied</>) : (<><Share2 size={14} /> Share</>)}
            </button>
            <button onClick={exportPdf}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900">
              <FileText size={14} /> PDF plan
            </button>
          </div>
          {auth.enabled && (
            auth.userId ? (
              <button onClick={saveToAccount} disabled={saveState === 'busy'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  saveState === 'saved' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}>
                {saveState === 'saved' ? (<><Check size={14} /> Saved — see My Plans</>) : (<><Save size={14} /> Save layout to my plans</>)}
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                <Link to="/plans" className="text-blue-600 font-medium">Sign in</Link> to save layouts
              </p>
            )
          )}

          <div className="text-sm text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            <div className="flex justify-between"><span>Cargo placed</span><span className="font-semibold">{capacity.floorCargo} / {totalQty}</span></div>
            <div className="flex justify-between">
              <span>Pallet positions</span>
              <span className="font-semibold">{capacity.floorCargo + capacity.rackPositions}
                <span className="text-slate-400 font-normal text-xs"> ({capacity.floorCargo} floor + {capacity.rackPositions} rack)</span>
              </span>
            </div>
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
                <p className="text-xs text-slate-600 mb-2 font-medium">Zones, multi-dock &amp; velocity slotting are next. Want them?</p>
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
        <div className="relative">
          {showTutorial && (
            <div className="absolute inset-0 z-20 rounded-lg bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <h2 className="text-white font-black text-xl mb-5">How this works</h2>
                <ol className="text-left space-y-4 mb-6">
                  <li className="flex gap-3 text-slate-200 text-sm">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white font-black flex items-center justify-center">1</span>
                    <span><b>Auto-arrange</b> lays pallets in rows with forklift aisles — or hit <b>“Place one”</b> on any palette item (pallets, racks, walls, office).</span>
                  </li>
                  <li className="flex gap-3 text-slate-200 text-sm">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white font-black flex items-center justify-center">2</span>
                    <span><b>Drag anything</b> to move it (it glows under your mouse). Use <b>Undo</b> / <b>Delete</b> below the view. Drag empty floor to rotate.</span>
                  </li>
                  <li className="flex gap-3 text-slate-200 text-sm">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-red-500 text-white font-black flex items-center justify-center">3</span>
                    <span>Block an aisle and cut-off pallets turn <b className="text-red-400">red</b>. <b>Click a pallet</b> to watch the forklift's route and clearance from the dock.</span>
                  </li>
                </ol>
                <button onClick={dismissTutorial} className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold">
                  Got it — let me try
                </button>
              </div>
            </div>
          )}
          <InteractiveLoadPlanner
            key={`${floorL}-${floorW}`}
            container={{ l: floorL, w: floorW, h: 350 }}
            boxes={base}
            grid={10}
            unitLabel="cm"
            showDoor
            doorEdge={dock}
            autoSpin
            hintOverlay
            hintText="Drag a pallet to move it · click one to see the forklift route"
            flagIds={reach.unreachable}
            path={path}
            pathWidth={aisle}
            selectId={selectedId}
            onSelect={setSelectedId}
            onChange={setLiveBoxes}
            registerSnapshot={(fn) => { snapshotFn.current = fn; }}
          />
          {selectedBox && (
            <div className={`mt-2 flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 ${
              path ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <Route size={16} />
              {path
                ? <>Forklift route to <b>{selectedBox.label}</b>: {pathLen.toFixed(1)} m from the dock — the band shows the {(aisle / 100).toFixed(1)} m clearance.</>
                : <>No route exists — <b>{selectedBox.label}</b> is cut off from the dock at this aisle width.</>}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {TIPS[tip]}
          </p>
          <p className="text-xs text-slate-400 mt-1">Green face = dock. Grid snap: 10 cm.</p>
        </div>
      </div>
    </div>
  );
}
