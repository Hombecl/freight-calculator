import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, CheckCircle2, Route, Share2, FileText, Save, Check } from 'lucide-react';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import {
  autoArrangeFloorD, checkReachabilityD, checkReachabilityTurn, forkliftPathTurn,
  placeNearDockD, positionCapacity, zoneStats, explainUnreachable,
  type FloorItemSpec, type DockEdge, type TruckSpec,
} from '../lib/warehouse';
import { floorOverloads, zoneViolations } from '../lib/realism';
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
const KIND_COLORS: Record<string, number> = { rack: 0x8b5cf6, obstacle: 0x64748b, zone: 0x0ea5e9, chilled: 0x38bdf8, frozen: 0x818cf8, hazmat: 0xf59e0b };

// aisle = straight working width; turn = clear square needed for a 90° turn
// (turning radius + load). Typical figures — verify against your truck spec.
const TRUCKS: { label: string; value: number; spec: TruckSpec }[] = [
  { label: 'Counterbalance forklift · 3.5 m aisle · 4.0 m turns', value: 350, spec: { aisle: 350, turn: 400 } },
  { label: 'Compact forklift · 3.0 m aisle · 3.5 m turns', value: 300, spec: { aisle: 300, turn: 350 } },
  { label: 'Reach truck · 2.7 m aisle · 3.2 m turns', value: 270, spec: { aisle: 270, turn: 320 } },
];

const DOCKS: { key: DockEdge; label: string }[] = [
  { key: 'E', label: 'Right' },
  { key: 'W', label: 'Left' },
  { key: 'S', label: 'Front' },
  { key: 'N', label: 'Back' },
];

const DEFAULT_ITEMS: FloorItemSpec[] = [
  { id: 'eur', label: 'EUR pallet', l: 120, w: 80, h: 150, qty: 40, color: PALETTE[0], kind: 'cargo', weight: 600 },
  { id: 'gma', label: 'GMA pallet', l: 122, w: 102, h: 150, qty: 20, color: PALETTE[1], kind: 'cargo', weight: 700 },
  { id: 'rack', label: 'Rack bay', l: 270, w: 110, h: 300, qty: 1, color: KIND_COLORS.rack, kind: 'rack', levels: 4 },
];

const QUICK_ADD: { label: string; spec: Omit<FloorItemSpec, 'id'> }[] = [
  { label: '+ Pallet', spec: { label: 'Pallet', l: 120, w: 80, h: 150, qty: 10, color: PALETTE[0], kind: 'cargo', weight: 600 } },
  { label: '+ Chilled pallet', spec: { label: 'Chilled pallet', l: 120, w: 80, h: 150, qty: 1, color: KIND_COLORS.chilled, kind: 'cargo', weight: 600, zoneReq: 'chilled' } },
  { label: '+ Hazmat pallet', spec: { label: 'Hazmat pallet', l: 120, w: 80, h: 150, qty: 1, color: KIND_COLORS.hazmat, kind: 'cargo', weight: 600, zoneReq: 'hazmat' } },
  { label: '+ Rack', spec: { label: 'Rack bay', l: 270, w: 110, h: 300, qty: 1, color: KIND_COLORS.rack, kind: 'rack', levels: 4 } },
  { label: '+ Column', spec: { label: 'Column', l: 40, w: 40, h: 350, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
  { label: '+ Wall', spec: { label: 'Wall section', l: 400, w: 20, h: 300, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
  { label: '+ Office', spec: { label: 'Office block', l: 500, w: 400, h: 280, qty: 1, color: KIND_COLORS.obstacle, kind: 'obstacle' } },
  { label: '+ Zone', spec: { label: 'Zone A', l: 600, w: 400, h: 3, qty: 1, color: KIND_COLORS.zone, kind: 'zone' } },
  { label: '+ Chilled zone', spec: { label: 'Chilled zone', l: 600, w: 400, h: 3, qty: 1, color: KIND_COLORS.chilled, kind: 'zone', zoneType: 'chilled' } },
  { label: '+ Hazmat zone', spec: { label: 'Hazmat zone', l: 600, w: 400, h: 3, qty: 1, color: KIND_COLORS.hazmat, kind: 'zone', zoneType: 'hazmat' } },
];

const KIND_CHIP: Record<string, { label: string; cls: string }> = {
  cargo: { label: 'cargo', cls: 'bg-amber-100 text-amber-700' },
  rack: { label: 'rack', cls: 'bg-purple-100 text-purple-700' },
  obstacle: { label: 'structure', cls: 'bg-slate-200 text-slate-600' },
  zone: { label: 'zone', cls: 'bg-sky-100 text-sky-700' },
};

const isStructure = (b: PlannerBox) => {
  const k = (b as PlannerBox & { kind?: string }).kind;
  return k === 'rack' || k === 'obstacle' || k === 'zone';
};

export default function WarehousePage() {
  const [floorL, setFloorL] = useState(2000); // cm
  const [floorW, setFloorW] = useState(1200);
  const [aisle, setAisle] = useState(300);
  const [dock, setDock] = useState<DockEdge[]>(['E']); // one or more dock edges
  const [items, setItems] = useState<FloorItemSpec[]>(DEFAULT_ITEMS);
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);
  const [baseline, setBaseline] = useState<PlannerBox[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const floor = useMemo(() => ({ l: floorL, w: floorW }), [floorL, floorW]);
  const truck = useMemo<TruckSpec>(
    () => TRUCKS.find((t) => t.value === aisle)?.spec ?? { aisle, turn: aisle + 50 },
    [aisle],
  );
  const vessel = useMemo(() => ({ l: floorL, w: floorW, h: 350 }), [floorL, floorW]);
  const initial = useMemo(
    () => autoArrangeFloorD({ l: 2000, w: 1200 }, DEFAULT_ITEMS, 300, 'E'),
    [],
  );
  const base = baseline ?? initial;
  const boxes = liveBoxes ?? base;
  const reach = useMemo(() => checkReachabilityTurn(floor, boxes, truck, dock), [floor, boxes, truck, dock]);
  const capacity = useMemo(() => positionCapacity(boxes), [boxes]);
  const zStats = useMemo(() => zoneStats(boxes), [boxes]);
  // physical realism: slab pressure + zone segregation
  const [slabRating, setSlabRating] = useState(0); // 0 = no check
  const slabOver = useMemo(() => floorOverloads(boxes, slabRating), [boxes, slabRating]);
  const zoneViol = useMemo(() => zoneViolations(boxes), [boxes]);
  const allFlags = useMemo(
    () => [...new Set([...reach.unreachable, ...slabOver.map((o) => o.id), ...zoneViol.map((v) => v.id)])],
    [reach, slabOver, zoneViol],
  );

  const totalQty = items.filter((i) => (i.kind ?? 'cargo') === 'cargo').reduce((s, x) => s + x.qty, 0);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(null), 6000); };

  /**
   * Auto-arrange = TIDY. If pallets are on the floor, it re-rows exactly those
   * pallets (nothing is deleted; the count is stated). On an empty floor it
   * fills from the palette quantities. Structures/zones always stay put.
   */
  const regen = (dockEdges: DockEdge[] = dock) => {
    const structures = boxes.filter(isStructure);
    const cargo = boxes.filter((b) => !isStructure(b));
    let rows;
    if (cargo.length > 0) {
      // group the CURRENT cargo into specs so the same pallets get re-rowed
      const groups = new Map<string, FloorItemSpec>();
      for (const b of cargo) {
        const key = `${b.label}|${b.l}x${b.w}x${b.h}`;
        const g = groups.get(key);
        if (g) g.qty++;
        else groups.set(key, { id: `t${groups.size}`, label: b.label, l: b.l, w: b.w, h: b.h, qty: 1, color: b.color, kind: 'cargo' });
      }
      rows = autoArrangeFloorD(floor, [...groups.values()], aisle, dockEdges[0] ?? 'E', structures);
      // anything that didn't fit the rows is KEPT — parked near the dock
      let parked = 0;
      let lost = 0;
      const leftovers = cargo.slice(rows.length);
      for (const b of leftovers) {
        const spot = placeNearDockD(floor, [...structures, ...rows], b, dockEdges[0] ?? 'E');
        if (spot) { rows.push({ ...b, px: spot.px, py: 0, pz: spot.pz }); parked++; }
        else lost++;
      }
      flash(lost > 0
        ? `Re-arranged ${cargo.length - lost} pallets (${parked} parked near the dock) — ${lost} could not fit ANYWHERE and were removed. Widen the floor or reduce quantities.`
        : parked > 0
          ? `Re-arranged ${rows.length} pallets: ${rows.length - parked} in aisled rows + ${parked} parked near the dock (rows were full). Structures and zones stayed put.`
          : `Re-arranged all ${rows.length} pallets into aisled rows. Structures and zones stayed put.`);
    } else {
      rows = autoArrangeFloorD(floor, items, aisle, dockEdges[0] ?? 'E', structures);
      flash(`Laid out ${rows.length} pallets from the palette with ${(aisle / 100).toFixed(1)} m aisles.`);
    }
    const next = [...structures, ...rows];
    const after = checkReachabilityTurn(floor, next, truck, dockEdges);
    if (after.unreachable.length > 0) {
      flash(`⚠ After arranging, ${after.unreachable.length} item(s) are NOT forklift-reachable (shown red) — drag rows aside, widen the aisle, or add a dock.`);
    }
    setBaseline(next);
    setLiveBoxes(null);
    setSelectedId(null);
    track('warehouse_arrange');
  };

  const changeDock = (edge: DockEdge) => {
    const next = dock.includes(edge)
      ? (dock.length > 1 ? dock.filter((d) => d !== edge) : dock) // keep at least one
      : [...dock, edge];
    setDock(next);
    regen(next);
  };

  // forklift route + clearance for the selected item
  const route = useMemo(
    () => (selectedId ? forkliftPathTurn(floor, boxes, truck, selectedId, dock) : null),
    [floor, boxes, truck, selectedId, dock],
  );
  const path = route?.points ?? null;
  const pathLen = useMemo(() => {
    if (!path || path.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < path.length; i++) len += Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z);
    return len / 100;
  }, [path]);
  const selectedBox = selectedId ? boxes.find((b) => b.id === selectedId) : null;
  const diagnosis = useMemo(() => {
    if (!selectedId || path || !selectedBox) return null;
    if (!reach.unreachable.includes(selectedId)) return null;
    // reachable ignoring turn geometry? then the problem is a CORNER, not a gap
    const straightOnly = checkReachabilityD(floor, boxes, truck.aisle, dock);
    if (!straightOnly.unreachable.includes(selectedId)) {
      return { kind: 'corner' as const, passableAt: null };
    }
    return { kind: 'gap' as const, ...explainUnreachable(floor, boxes, selectedId, dock) };
  }, [selectedId, path, selectedBox, reach, floor, boxes, dock, truck]);
  useEffect(() => { if (selectedId) track('warehouse_route'); }, [selectedId]);
  // E2E hook: real box state, verifiable from tests
  useEffect(() => { (window as unknown as { __dpBoxes?: PlannerBox[] }).__dpBoxes = boxes; }, [boxes]);

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
  const [placeMsg, setPlaceMsg] = useState<string | null>(null);
  const placeOne = (spec: FloorItemSpec) => {
    const spot = placeNearDockD(floor, boxes, spec, dock[0] ?? 'E');
    if (!spot) {
      setPlaceMsg(`No free spot for ${spec.label} (${spec.l}×${spec.w} cm) — clear an area or shrink it.`);
      setTimeout(() => setPlaceMsg(null), 4000);
      return;
    }
    const nb: PlannerBox & { kind?: string; levels?: number } = {
      id: `${spec.id}-m${Date.now() % 100000}`,
      label: spec.label,
      l: spec.l, w: spec.w, h: spec.h,
      px: spot.px, py: 0, pz: spot.pz,
      color: spec.color,
      kind: spec.kind ?? 'cargo',
      levels: spec.levels,
      ...(spec.weight ? { weight: spec.weight } : {}),
      ...(spec.zoneReq ? { zoneReq: spec.zoneReq } : {}),
      ...(spec.zoneType ? { zoneType: spec.zoneType } : {}),
    };
    setBaseline([...boxes, nb]);
    setLiveBoxes(null);
    setSelectedId(nb.id);
    track('warehouse_place_one', spec.kind ?? 'cargo');
  };

  // example layouts
  const loadExample = (key: 'threepl' | 'crossdock') => {
    if (key === 'threepl') {
      const fl = { l: 2400, w: 1700 };
      setFloorL(fl.l); setFloorW(fl.w); setAisle(300); setDock(['E']);
      const its: FloorItemSpec[] = [
        { id: 'eur', label: 'EUR pallet', l: 120, w: 80, h: 150, qty: 48, color: PALETTE[0], kind: 'cargo' },
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
      setFloorL(fl.l); setFloorW(fl.w); setAisle(350); setDock(['E']);
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
    if (p.dock) setDock(Array.isArray(p.dock) ? p.dock : [p.dock]);
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
      floor, aisle, dock: dock.join('+'), boxes,
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
        Every slotting mistake surfaces on day one — a corner the forklift can't turn, a mezzanine
        the racks overload, chilled goods parked outside the cold zone. This planner runs those checks
        <b> while you draw</b>: anything a forklift can no longer reach from the dock turns{' '}
        <span className="text-red-500 font-semibold">red</span>, corners are tested against the truck's
        90° turn box, and slab pressure + zone rules flag violations instantly.
      </p>

      <p className="text-xs text-slate-400 -mt-2 mb-4">
        Quick tools: <a href="/warehouse-space-calculator" className="text-blue-600 font-semibold hover:underline">Warehouse space calculator</a> · <a href="/forklift-aisle-width-calculator" className="text-blue-600 font-semibold hover:underline">Forklift aisle width calculator</a>
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
            <label className="block text-xs font-semibold text-slate-500 mb-1">Dock sides <span className="text-slate-400 font-normal">(green edges — toggle multiple)</span></label>
            <div className="flex gap-1">
              {DOCKS.map((d) => (
                <button key={d.key} onClick={() => changeDock(d.key)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                    dock.includes(d.key) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Forklift aisle width</label>
            <select value={aisle} onChange={(e) => setAisle(+e.target.value)} className="w-full text-sm px-2 py-1.5 rounded border border-slate-200">
              {TRUCKS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <label className="block text-xs font-semibold text-slate-500 mt-2 mb-1">Floor slab rating</label>
            <select
              value={slabRating}
              onChange={(e) => setSlabRating(Number(e.target.value))}
              className="w-full text-sm px-2 py-1.5 rounded border border-slate-200"
              title="Max ground pressure the slab takes. Racks count levels × 600 kg pallets. Mezzanines are often ~500-1000 kg/m²; ground slabs 3000-5000."
            >
              <option value={0}>No slab check</option>
              <option value={1000}>Mezzanine · 1,000 kg/m²</option>
              <option value={2000}>Light slab · 2,000 kg/m²</option>
              <option value={3000}>Standard slab · 3,000 kg/m²</option>
              <option value={5000}>Heavy slab · 5,000 kg/m²</option>
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
            {placeMsg && <p className="text-xs text-red-500">{placeMsg}</p>}
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
                      <label className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                        <input type="checkbox" checked={(s.stack ?? 1) >= 2}
                          onChange={(e) => updateItem(s.id, { stack: e.target.checked ? 2 : 1 })} />
                        stack ×2
                      </label>
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
            Auto-arrange: tidy pallets into aisled rows
          </button>
          {actionMsg && <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2">{actionMsg}</p>}

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
            {slabOver.length > 0 && (
              <p className="text-xs text-red-500">
                🏗️ <b>{new Set(slabOver.map((o) => o.id)).size} spot{new Set(slabOver.map((o) => o.id)).size === 1 ? '' : 's'} exceed the slab rating</b> ({slabRating.toLocaleString()} kg/m²) — worst is {Math.round(Math.max(...slabOver.map((o) => o.kgM2))).toLocaleString()} kg/m². Un-stack, spread the load, or verify the slab spec.
              </p>
            )}
            {zoneViol.length > 0 && (
              <p className="text-xs text-red-500">
                🧊 <b>{zoneViol.length} item{zoneViol.length === 1 ? '' : 's'} outside their required zone</b> ({[...new Set(zoneViol.map((v) => v.need))].join(', ')}) — drag them fully inside a matching zone, or add one from the palette.
              </p>
            )}
            {zStats.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-500">Zones</span>
                {zStats.map((z) => (
                  <div key={z.id} className="flex justify-between text-xs mt-1">
                    <span className="text-sky-700 font-medium">{z.label}</span>
                    <span className="text-slate-600">{z.cargo} cargo · {z.rackPositions} rack pos · {z.coverage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
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
            container={vessel}
            boxes={base}
            grid={10}
            unitLabel="cm"
            showDoor
            doorEdges={dock}
            autoSpin
            hintOverlay
            hintText="Drag a pallet to move it · click one to see the forklift route"
            flagIds={allFlags}
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
                ? pathLen < 0.5
                  ? <>Forklift route to <b>{selectedBox.label}</b>: right at the dock — band shows the {(aisle / 100).toFixed(1)} m working width.</>
                  : <>Forklift route to <b>{selectedBox.label}</b>: {pathLen.toFixed(1)} m, {route?.turns ?? 0} turn{(route?.turns ?? 0) === 1 ? '' : 's'} — each turn checked against the {(truck.turn / 100).toFixed(1)} m turn box.</>
                : diagnosis?.kind === 'corner'
                  ? <>🚫 <b>{selectedBox.label}</b> is straight-line reachable, but a CORNER on the way is too tight to turn — this truck needs a {(truck.turn / 100).toFixed(1)} m clear square to swing 90°. Widen the junction or pick a smaller truck.</>
                  : diagnosis?.passableAt
                    ? <>🚫 <b>{selectedBox.label}</b> is cut off: the gaps around it only allow ≈{(diagnosis.passableAt / 100).toFixed(1)} m, but your forklift needs {(aisle / 100).toFixed(1)} m. Move a neighbour to widen the gap{diagnosis.passableAt >= 270 ? ', or switch to a reach truck (2.7 m)' : ''}.</>
                    : <>🚫 <b>{selectedBox.label}</b> is fully enclosed — no route exists at ANY width. Clear a path toward a dock, or add a dock on another edge.</>}
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
