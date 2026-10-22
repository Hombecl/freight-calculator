import {usePlannerAlternatives} from '../hooks/usePlannerAlternatives';
import PlannerLayoutOptions,{layoutName} from '../components/PlannerLayoutOptions';
import PackingGain from '../components/PackingGain';
import { useWorkspace } from '../components/layout/WorkspacePreferences';
import ProductUpdate from '../components/ProductUpdate';
import {usePackingWorker} from '../hooks/usePackingWorker';
import PlannerReviewPanel from '../components/PlannerReviewPanel';
import {reviewPlanner} from '../lib/plannerReview';
import {plannerManifestCSV,type PlannerReportView} from '../lib/plannerReport';
import {readPlannerHistory,savePlannerSnapshot,snapshotRevision,snapshotChanges,type PlannerSnapshot} from '../lib/plannerHistory';
import {shouldCalculate, type CalculationSource} from '../lib/plannerInteractions';
import ExportFeedback from '../components/ExportFeedback';
import WorkflowJob,{useWorkflowJob} from '../components/WorkflowJob';
import {recordToolOutput} from '../lib/workflowUsage';
import {CARGO_TRANSFER} from '../lib/workflowTransfer';
import ShareSnapshot from '../components/ShareSnapshot';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Download, FileText, Check, Save } from 'lucide-react';
import { IS_ZH } from '../lib/locale';
import { savePlan, getPlan } from '../lib/plans';
import ImportModal from '../components/ImportModal';
import { PACKING_LIST_EXAMPLE } from '../lib/packingListExample';
import { TEMPLATE_CSV } from '../lib/importCartons';
import InteractiveLoadPlanner, { PlannerBox } from '../components/InteractiveLoadPlanner';
import { computeStats, type PackItemSpec } from '../lib/binPacking';
import { axleLoads, mckeeSafeLoad, palletOverhang, heavyOverLight, cogHeight, loadVoids, type AxleConfig } from '../lib/realism';
import { downloadText, openPrintablePlan, type PlanMeta } from '../lib/exportPlan';
import { useEntitlement } from '../hooks/useEntitlement';
import { useAuth } from '../hooks/useAuth';
import PaywallModal from '../components/PaywallModal';
import { track } from '../lib/track';
import { performExport, trackExport, type ExportFormat } from '../lib/exportTracking';
import { checkoutEnabled } from '../lib/billing';
import type { LeadPurpose } from '../lib/leadPurpose';

/**
 * PlannerPage — the interactive load-planning workspace.
 *
 * Seeds an editable 3D plan with the real Extreme-Point bin-packer
 * (src/lib/binPacking.ts), honouring weight + max-stack constraints, then hands
 * control to the user (drag / rotate / stack). Live stats (volume, weight,
 * centre-of-gravity balance) recompute as the plan is edited.
 */

// Vessels: sea containers, road trailers and pallets — one engine serves all.
// door = the aperture cargo must PASS THROUGH — smaller than the interior
// (ISO door ≈ 234×228, high-cube 234×258). Tools that skip this let you plan
// loads that physically cannot enter the box.
const CONTAINERS = {
  '20gp': { label: "20' GP", l: 589, w: 235, h: 239, maxWeight: 28200, group: 'Containers', door: { w: 234, h: 228 }, tare: 2300 },
  '40gp': { label: "40' GP", l: 1203, w: 235, h: 239, maxWeight: 26700, group: 'Containers', door: { w: 234, h: 228 }, tare: 3750 },
  '40hq': { label: "40' HQ", l: 1203, w: 235, h: 269, maxWeight: 26500, group: 'Containers', door: { w: 234, h: 258 }, tare: 3900 },
  '53ft': { label: "53' trailer", l: 1602, w: 254, h: 269, maxWeight: 20000, group: 'Trucks', door: { w: 254, h: 269 }, axles: { frontPos: 90, rearPos: 1450, frontLimit: 13600, rearLimit: 15400 } as AxleConfig },
  'eusemi': { label: 'EU 13.6m', l: 1360, w: 245, h: 270, maxWeight: 24000, group: 'Trucks', door: { w: 245, h: 270 }, axles: { frontPos: 120, rearPos: 1050, frontLimit: 12000, rearLimit: 24000 } as AxleConfig },
  'eurpal': { label: 'EUR pallet', l: 120, w: 80, h: 165, maxWeight: 1500, group: 'Pallets', door: null },
  'gmapal': { label: 'GMA 48×40"', l: 122, w: 102, h: 152, maxWeight: 1134, group: 'Pallets', door: null },
  // Amazon FBA LTL: 40×48 GMA, 72" total incl ~15 cm pallet → 167 cm cargo,
  // 1,500 lb (680 kg), zero overhang — Amazon rejects overhanging pallets
  'fbapal': { label: 'FBA pallet', l: 122, w: 102, h: 167, maxWeight: 680, group: 'Pallets', door: null },
} as const;

/**
 * Can this carton pass through the door in ANY allowed orientation? Moving
 * along the container axis, its cross-section (two of its dims) must fit the
 * door aperture. keepUpright pins the h-dimension vertical.
 */
function fitsDoor(s: Spec, door: { w: number; h: number } | null): boolean {
  if (!door) return true; // pallets are open — no aperture
  if (s.allowRotate === false) return s.w <= door.w && s.h <= door.h;
  const dims = [s.l, s.w, s.h];
  if (s.keepUpright) return Math.min(s.l, s.w) <= door.w && s.h <= door.h;
  for (let vert = 0; vert < 3; vert++) {
    for (let across = 0; across < 3; across++) {
      if (across === vert) continue;
      if (dims[across] <= door.w && dims[vert] <= door.h) return true;
    }
  }
  return false;
}
type ContainerKey = keyof typeof CONTAINERS;

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xf472b6, 0xa78bfa, 0xf87171];

type Spec = PackItemSpec;

// Quantities sized so the default view opens on a genuinely FULL container —
// the first impression must demonstrate high utilization, not an empty box.
const DEFAULT_SPECS: Spec[] = [
  { id: 's1', label: 'Master carton', l: 60, w: 50, h: 45, weight: 18, qty: 140, color: PALETTE[0], unloadOrder: 2 },
  { id: 's2', label: 'Half carton', l: 55, w: 45, h: 40, weight: 12, qty: 70, color: PALETTE[1], unloadOrder: 2 },
  { id: 's3', label: 'Fragile display', l: 45, w: 40, h: 30, weight: 6, qty: 30, color: PALETTE[2], maxStack: 0, unloadOrder: 1 },
];

/** Example scenarios reachable from the homepage via /planner?demo=... */
const PRESETS: Record<string, { container: ContainerKey; specs: Spec[] }> = {
  excel: { container: '20gp', specs: PACKING_LIST_EXAMPLE },
  retail: {
    container: '20gp',
    specs: DEFAULT_SPECS,
  },
  furniture: {
    container: '40hq',
    specs: [
      { id: 'p1', label: 'Sofa boxes (this way up)', l: 200, w: 90, h: 80, weight: 45, qty: 25, color: PALETTE[3], keepUpright: true },
      { id: 'p2', label: 'Flat-pack (this way up)', l: 120, w: 80, h: 15, weight: 32, qty: 80, color: PALETTE[4], keepUpright: true },
      { id: 'p3', label: 'Chair boxes', l: 65, w: 60, h: 55, weight: 14, qty: 60, color: PALETTE[5] },
    ],
  },
  pallet: {
    container: 'gmapal',
    specs: [
      { id: 'c1', label: 'Case 40×30×25', l: 40, w: 30, h: 25, weight: 12, qty: 45, color: PALETTE[0] },
      { id: 'c2', label: 'Case 30×25×20', l: 30, w: 25, h: 20, weight: 8, qty: 18, color: PALETTE[1] },
    ],
  },
  multistop: {
    container: '20gp',
    specs: [
      { id: 'p1', label: 'Stop 3 — deepest', l: 60, w: 50, h: 45, weight: 20, qty: 85, color: PALETTE[0], unloadOrder: 3 },
      { id: 'p2', label: 'Stop 2 — middle', l: 55, w: 45, h: 40, weight: 15, qty: 85, color: PALETTE[1], unloadOrder: 2 },
      { id: 'p3', label: 'Stop 1 — at the door', l: 50, w: 40, h: 35, weight: 10, qty: 95, color: PALETTE[2], unloadOrder: 1 },
    ],
  },
};

export default function PlannerPage() {
  const { showUpdates } = useWorkspace();
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  const [params] = useSearchParams();
  const preset = PRESETS[params.get('demo') ?? ''];
  const [containerKey, setContainerKey] = useState<ContainerKey>(preset?.container ?? '20gp');
  const [specs, setSpecs] = useState<Spec[]>(preset?.specs ?? DEFAULT_SPECS);
  // Draft edits must never be combined with the last calculated boxes/stats.
  const [workflowJob,setWorkflowJob]=useWorkflowJob('planner');
  const [reportName,setReportName]=useState('');
  const [reportView,setReportView]=useState<PlannerReportView>('crew');
  const [history,setHistory]=useState(readPlannerHistory);
  const [historyMessage,setHistoryMessage]=useState('');
  const [appliedSpecs, setAppliedSpecs] = useState<Spec[]>(specs);
  const hasInputChanges = JSON.stringify(specs) !== JSON.stringify(appliedSpecs);
  useEffect(() => {
    if (hasInputChanges) track('planner_inputs_changed');
  }, [hasInputChanges]);
  const [seed, setSeed] = useState(0); // bump to re-run the packer
  const optimizationIntent = useRef<CalculationSource | null>(null);

  const container = CONTAINERS[containerKey];
  // pallets may allow a small overhang per side — standard practice, but it
  // cuts carton compression strength ~30%, so we pack it AND warn about it
  const [overhangCm, setOverhangCm] = useState(0);
  const packSpace = useMemo(() => {
    // FBA locks overhang to zero — Amazon rejects overhanging pallets outright
    const ov = container.group === 'Pallets' && containerKey !== 'fbapal' ? overhangCm : 0;
    return ov > 0 ? { ...container, l: container.l + 2 * ov, w: container.w + 2 * ov } : container;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, overhangCm, containerKey]);

  const packing = usePackingWorker(packSpace, appliedSpecs, seed);
  const alternatives = usePlannerAlternatives(packSpace,appliedSpecs,packing.result);
  const [layoutChoice,setLayoutChoice]=useState<{base:typeof packing.result;index:number}|null>(null);
  const selectedLayout=layoutChoice?.base===packing.result ? layoutChoice.index : 0;
  const result = (selectedLayout>0 ? alternatives.items[selectedLayout-1]?.result : null) ?? packing.result;
  const selectedMethod=selectedLayout>0 ? alternatives.items[selectedLayout-1]?.id??'recommended' : 'recommended';
  const hasPendingChanges = hasInputChanges || !packing.ready;
  useEffect(() => {
    // Count an intentional, completed calculation, not the automatic demo on entry.
    if (!packing.ready) return;
    const source = optimizationIntent.current;
    if (!source) return;
    optimizationIntent.current = null;
    track('planner_optimized', source);
    track('planner_calc_result', `${source}:${result.unplaced?'partial':'full'}`);
  }, [result, packing.ready]);

  // live stats reflect manual edits (falls back to the packer's own stats)
  const [liveBoxes, setLiveBoxes] = useState<PlannerBox[] | null>(null);
  // a plan opened from a share link (exact positions as shared)
  const [sharedBoxes, setSharedBoxes] = useState<PlannerBox[] | null>(null);
  const stats = useMemo(() => {
    const effective = liveBoxes ?? sharedBoxes;
    return effective ? computeStats(effective, container) : result.stats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBoxes, sharedBoxes, result, container]);

  const totalQty = appliedSpecs.reduce((s, x) => s + x.qty, 0);
  const balanceWarn = Math.abs(stats.cogOffsetPct.x) > 15 || Math.abs(stats.cogOffsetPct.z) > 15;
  const shownBoxes = liveBoxes ?? sharedBoxes ?? result.boxes;
  const axles = useMemo(
    () => ('axles' in container && container.axles ? axleLoads(shownBoxes as (PlannerBox & { weight?: number })[], container.axles) : null),
    [shownBoxes, container],
  );
  const overhang = useMemo(
    () => (container.group === 'Pallets' ? palletOverhang(shownBoxes, { l: container.l, w: container.w }) : null),
    [shownBoxes, container],
  );
  const voids = useMemo(
    () => (container.group !== 'Pallets' ? loadVoids(shownBoxes, packSpace) : null),
    [shownBoxes, container, packSpace],
  );
  const voidWarn = voids != null && (voids.doorSlack > 15 || voids.biggestGap > 15);
  const stackWarn = useMemo(() => heavyOverLight(shownBoxes as (PlannerBox & { weight?: number })[]), [shownBoxes]);
  const cogH = useMemo(() => cogHeight(shownBoxes as (PlannerBox & { weight?: number })[]), [shownBoxes]);
  const topHeavy = cogH != null && cogH.pct > 55;
  // real-world check other tools skip: the door aperture is SMALLER than the interior
  const doorBlocked = useMemo(
    () => appliedSpecs.filter((s) => s.qty > 0 && !fitsDoor(s, CONTAINERS[containerKey].door)),
    [appliedSpecs, containerKey],
  );

  const editKinds = useRef(new Set<string>());
  const updateSpec = (id: string, patch: Partial<Spec>) => {
    const kind = Object.keys(patch)[0];
    if(!editKinds.current.has(kind)){editKinds.current.add(kind);track('planner_input_kind',kind);}
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, ...(patch.weight === undefined ? {} : {weightKnown:true}) } : s)));
  };

  const addSpec = () =>
    setSpecs((prev) => [
      ...prev,
      {
        id: `s${prev.length + 1}-${Date.now()}`,
        label: `Carton ${String.fromCharCode(65 + prev.length)}`,
        l: 40, w: 30, h: 30, weight: 10, qty: 12,
        color: PALETTE[prev.length % PALETTE.length],
      },
    ]);

  const removeSpec = (id: string) => setSpecs((prev) => prev.filter((s) => s.id !== id));

  const regen = (source: CalculationSource = 'manual', nextSpecs = specs) => {
    if(!shouldCalculate(source, JSON.stringify(nextSpecs)!==JSON.stringify(appliedSpecs)))return;
    editKinds.current.clear();
    optimizationIntent.current = source;
    setAppliedSpecs(nextSpecs);
    setLiveBoxes(null); setSharedBoxes(null); setSeed((n) => n + 1);
  };

  // ---- Excel/CSV import (Tier 2 switching-cost killer — ENTERPRISE.md §4) ----
  // ?import=1 opens the modal on arrival. The /compare/* pages promise "import
  // your existing Excel and see your load in 3D in under a minute" but linked to
  // a bare /planner, so the promise and the destination did not match. Someone
  // arriving from a competitor comparison already HAS their carton list in the
  // other tool — landing them on the import step is the evaluation moment.
  const [importOpen, setImportOpen] = useState(() => params.get('import') === '1');
  useEffect(() => { if (params.get('import') === '1') track('import_open', 'deeplink'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onImport = (imported: Spec[]) => {
    setSpecs(imported);
    track('import_cartons', String(imported.length));
    regen('import', imported);
  };

  // ---- share links (free, no gate — sharing is the viral loop) ----
  const shareId = params.get('share');

  useEffect(() => {
    if (!shareId) return;
    (async () => {
      try {
        const res = await fetch(`/api/share?id=${shareId}`);
        if (!res.ok) return;
        const plan = await res.json();
        if (plan.containerKey && CONTAINERS[plan.containerKey as ContainerKey]) setContainerKey(plan.containerKey);
        if (Array.isArray(plan.specs)) { setSpecs(plan.specs); setAppliedSpecs(plan.specs); }
        if([0,2.5,5].includes(plan.overhangCm))setOverhangCm(plan.overhangCm);
        if(typeof plan.reportName==='string')setReportName(plan.reportName.slice(0,120));
        if(typeof plan.jobId==='string')setWorkflowJob({id:plan.jobId,own:false});
        setLiveBoxes(null);
        setSharedBoxes(Array.isArray(plan.boxes) ? plan.boxes : null);
        setSeed((n) => n + 1);
        track('share_open');
      } catch { /* leave defaults */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const auth = useAuth();

  // ---- save to account (Tier 1 data gravity — see ENTERPRISE.md) ----
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [resultDetails,setResultDetails]=useState(false);
  const [rotateView,setRotateView]=useState(()=>typeof window!=='undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [accountName,setAccountName]=useState('');
  const [saveAsTemplate,setSaveAsTemplate]=useState(false);
  const [accountMessage,setAccountMessage]=useState('');
  const savedId = params.get('saved');

  useEffect(() => {
    if (!savedId || !auth.ready || !auth.userId) return;
    (async () => {
      const plan = await getPlan(savedId);
      if (!plan) { setAccountMessage(T('This saved plan is unavailable. Sign in to its owner account and retry.','此方案未能載入，請登入保存方案的帳戶後再試。')); return; }
      if (CONTAINERS[plan.container_key as ContainerKey]) setContainerKey(plan.container_key as ContainerKey);
      if (Array.isArray(plan.specs)) { setSpecs(plan.specs); setAppliedSpecs(plan.specs); }
      setLiveBoxes(null);
      const asTemplate=params.get('template')==='1';
      setOverhangCm([0,2.5,5].includes(Number(plan.stats?.overhangCm)) ? Number(plan.stats?.overhangCm) : 0);
      setReportName(asTemplate ? '' : plan.name);
      setWorkflowJob({id:!asTemplate && typeof plan.stats?.jobId==='string' ? plan.stats.jobId : crypto.randomUUID(),own:false});
      setSharedBoxes(asTemplate ? null : Array.isArray(plan.boxes) ? plan.boxes : null);
      setSeed((n) => n + 1);
      track('saved_open');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId,auth.ready,auth.userId]);

  const saveToAccount = async () => {
    if (hasPendingChanges) return;
    const name = accountName.trim();
    if (!name) { setAccountMessage(T('Enter a job or template name first.','請先輸入工作或模板名稱。')); return; }
    setSaveState('busy');
    try {
    const { error } = await savePlan({
      name,
      container_key: containerKey,
      container,
      specs: appliedSpecs,
      boxes: currentBoxes,
      stats: { volumeUtil: stats.volumeUtil, totalWeight: stats.totalWeight, placedCount: currentBoxes.length, kind: saveAsTemplate ? 'template' : 'job', jobId:workflowJob.id, overhangCm },
    });
    if (error) {
      setSaveState('error'); setAccountMessage(T('Save failed. Your plan is still here; please try again.','保存失敗，方案仍然保留，請重試。'));
    } else {
      track('plan_saved');
      setSaveState('saved'); setAccountMessage(T('Saved to your account. Open My plans & templates to reuse it.','已保存到帳戶，可到我的方案與模板重用。'));
    }
    } catch { setSaveState('error'); setAccountMessage(T('Connection interrupted. Please retry saving.','連線中斷，請重新保存。')); }
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // export
  const snapshotFn = useRef<(() => string | null) | null>(null);
  const currentBoxes = liveBoxes ?? sharedBoxes ?? result.boxes;
  const meta = (): PlanMeta => ({
    title: T('Container Load Plan','貨櫃裝載計劃') + (selectedLayout>0 && !liveBoxes && !sharedBoxes ? ` — ${layoutName(selectedMethod,IS_ZH)}` : ''),
    containerLabel: container.label,
    container,
    unit: 'cm',
    weightUnit: 'kg',
    date: new Date().toISOString(),
  });
  const review=useMemo(()=>reviewPlanner(currentBoxes,packSpace,appliedSpecs,container.door),[currentBoxes,packSpace,appliedSpecs,container]);
  const revision=snapshotRevision({containerKey,overhangCm,specs:appliedSpecs,boxes:currentBoxes});
  const currentSnapshot=():PlannerSnapshot=>({jobId:workflowJob.id,name:reportName,containerKey,overhangCm,specs:appliedSpecs,boxes:currentBoxes,revision,savedAt:new Date().toISOString()});
  const preserve=()=>{if(hasPendingChanges)return false;try{setHistory(savePlannerSnapshot(currentSnapshot()));setHistoryMessage(T('Version saved on this device.','版本已儲存在本機。'));return true;}catch{setHistoryMessage(T('Could not save this version. Check device storage before leaving.','未能保存版本。離開前請檢查本機儲存空間。'));return false;}};
  const restore=(v:PlannerSnapshot)=>{
    if(!CONTAINERS[v.containerKey as ContainerKey])return;
    setContainerKey(v.containerKey as ContainerKey);setOverhangCm(v.overhangCm);
    setSpecs(v.specs);setAppliedSpecs(v.specs);setLiveBoxes(null);setSharedBoxes(v.boxes);setSeed(n=>n+1);
    setReportName(v.name);setWorkflowJob({id:v.jobId,own:false});
    setHistoryMessage(T('Saved version reopened. Confirm own-job again; edits make a new revision.','已重開保存版本。請重新確認自己的工作；修改會產生新版本。'));
  };
  const comparedBase=useRef<typeof packing.result|null>(null);
  useEffect(()=>{
    if(alternatives.status!=='done' || comparedBase.current===packing.result)return;
    comparedBase.current=packing.result;
    if(hasPendingChanges || liveBoxes || sharedBoxes)return;
    const options=[packing.result,...alternatives.items.map(a=>a.result)];
    let best=0;
    for(let i=1;i<options.length;i++)if(options[i].stats.volumeUtil>options[best].stats.volumeUtil+1e-6 || (Math.abs(options[i].stats.volumeUtil-options[best].stats.volumeUtil)<1e-6 && options[i].boxes.length>options[best].boxes.length))best=i;
    if(best>0 && preserve())setLayoutChoice({base:packing.result,index:best});
    // Candidate completion runs once; do not replace subsequent user choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[alternatives.status,alternatives.items,packing.result,hasPendingChanges,liveBoxes,sharedBoxes]);
  const reportInput=()=>({meta:meta(),boxes:currentBoxes,requestedSpecs:appliedSpecs,reviewContainer:packSpace,door:container.door,reportView,reportReference:reportName||workflowJob.id.slice(0,8),revision,zh:IS_ZH});
  const transferCargo=(e:React.MouseEvent<HTMLAnchorElement>,target:'quote'|'compare')=>{
    if(hasPendingChanges||appliedSpecs.some(s=>s.weightKnown===false)){e.preventDefault();setExportError(T('Update this plan and supply missing weights first.','請先更新方案並填寫缺少嘅重量。'));return;}
    if(!preserve()){e.preventDefault();return;}
    try{sessionStorage.setItem(CARGO_TRANSFER,JSON.stringify({model:'loose-cartons',orderId:workflowJob.id,revision,specs:appliedSpecs,ownJob:workflowJob.own}));track('workflow_transfer',target==='compare'?'planner_compare':'planner_cartons');}catch{e.preventDefault();setExportError(T('Device storage is full.','本機儲存已滿。'));}
  };
  const [exportError, setExportError] = useState<string | null>(null);
  const [feedbackFormat, setFeedbackFormat] = useState<'pdf'|'csv'|null>(null);
  const runExport = (format: ExportFormat) => {
    if (hasPendingChanges) {
      trackExport('export_failed', 'planner', format, 'stale_plan');
      setExportError(T('Select Optimise pack to update your plan first.', '請先按 Optimise pack 更新方案。'));
      return;
    }
    if(appliedSpecs.some(s=>s.weightKnown===false)) { setExportError(T('Supply each missing carton weight and optimise again before exporting a weight estimate.','請填寫缺少嘅箱重並重新計算，再匯出重量估算。'));return; }
    const outcome = performExport('planner', format, () => {
      if (format === 'csv') return downloadText(`load-plan-${revision}.csv`, plannerManifestCSV(reportInput()));
      return openPrintablePlan({
        ...reportInput(), stats, zones: liveBoxes || sharedBoxes ? [] : result.zones, boxes: currentBoxes,
        totalRequested: totalQty, imageDataUrl: snapshotFn.current?.() ?? null,
      });
    });
    if(outcome.ok){if(review.complete)void recordToolOutput(workflowJob,format==='pdf'?'planner_pdf':'planner_csv',{containerKey,specs:appliedSpecs,boxes:currentBoxes});else track('workflow_result','planner_draft');}
    if(outcome.ok) setFeedbackFormat(previous=>previous??format);
    setExportError(outcome.ok ? null : outcome.reason === 'popup_blocked'
      ? T('Allow pop-ups for this site, then select PDF plan again.', '請允許此網站開啟彈出視窗，再按 PDF plan。')
      : T('Export did not open. Your plan is still here; please try again.', '匯出未能開啟。方案仍然保留，請再試一次。'));
  };

  // export gate: secure Pro (Supabase-verified) OR free email lead-capture
  const ent = useEntitlement();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const pending = useRef<ExportFormat | null>(null);
  const guardExport = (format: ExportFormat) => {
    trackExport('export_requested', 'planner', format);
    setExportError(null);
    if (hasPendingChanges || auth.isPro || ent.canExport) { runExport(format); return; }
    pending.current = format;
    trackExport('export_gate_viewed', 'planner', format);
    setPaywallOpen(true);
  };
  const exportCsv = () => guardExport('csv');
  const exportPdf = () => guardExport('pdf');
  const closeExportGate = () => {
    if (pending.current) trackExport('export_gate_dismissed', 'planner', pending.current);
    pending.current = null;
    setPaywallOpen(false);
  };
  const onUnlock = (email: string, proWaitlist: boolean, purpose?: LeadPurpose) => {
    ent.submitEmail(email, proWaitlist, purpose);
    setPaywallOpen(false);
    const format = pending.current;
    pending.current = null;
    // Stay inside the click gesture for pop-ups, using the current plan, not an old closure.
    if (format) {
      trackExport('export_gate_unlocked', 'planner', format);
      runExport(format);
    }
  };

  return (
    <div className="w-full max-w-[1520px] mx-auto px-3 md:px-5 py-4">
      <Helmet>
        {/* Intent split (2026-08-23): the homepage owned "3d packing simulator" at
            pos 1-2 until this page's title was exact-matched to the same query in
            137b419 — after which BOTH pages ranked (7.4 / 13.6) and clicks went to
            zero. This page now targets its own cluster: "3d load planner",
            "container loading simulator", "load plan". Do not re-add
            "packing simulator" here; that phrase belongs to the homepage. */}
        <title>{T("Free 3D Container Loading Calculator & Load Planner | DimPack3D", "免費 3D 裝櫃計算器 — 貨單匯入與裝載規劃 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Plan 20ft and 40ft container loads in 3D. Import Excel/CSV, check weight and stacking limits, and export a PDF plan. No signup to plan; free export asks for email.",
          "免費規劃 20 呎、40 呎貨櫃 3D 裝載。匯入 Excel／CSV 貨單，檢查重量與堆疊限制，匯出 PDF 裝載圖。規劃毋須註冊；免費匯出需填電郵。")} />
      </Helmet>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">{T("Free 3D Container Loading Calculator", "免費 3D 裝櫃計算器")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {T("Turn your carton list into a container load plan. Choose a 20ft, 40ft or high-cube container, check what fits, then adjust the 3D layout by hand.", "將紙箱貨單變成裝櫃計劃。選擇 20 呎、40 呎或高櫃，檢查可裝數量，再手動微調 3D 擺位。")}
        </p>
      </div>

      {showUpdates && <div className="mb-4"><ProductUpdate planner /></div>}
      {packing.ready && <PlannerLayoutOptions base={packing.result} items={alternatives.items} status={alternatives.status} selected={selectedLayout} modified={!!liveBoxes||!!sharedBoxes} disabled={hasPendingChanges} zh={IS_ZH} onFind={()=>{alternatives.start();track('planner_layout_compare');}} onCancel={alternatives.cancel} onSelect={index=>{
        if(hasPendingChanges || (!liveBoxes && !sharedBoxes && index===selectedLayout))return;
        if(!preserve())return;
        setLiveBoxes(null);setSharedBoxes(null);setLayoutChoice({base:packing.result,index});
        track('planner_layout_select',index===0?'recommended':alternatives.items[index-1]?.id??'recommended');
      }}/> }

      <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)] gap-4 xl:gap-5">
        {/* left: inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Container</label>
            {(['Containers', 'Trucks', 'Pallets'] as const).map((g) => (
              <div key={g} className="flex gap-1 mb-1 items-center">
                <span className="w-16 shrink-0 text-[10px] uppercase text-slate-400">{g}</span>
                {(Object.keys(CONTAINERS) as ContainerKey[]).filter((k) => CONTAINERS[k].group === g).map((k) => (
                  <button
                    key={k}
                    onClick={() => { if(k===containerKey)return; setContainerKey(k); regen('container'); }}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      containerKey === k ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {CONTAINERS[k].label}
                  </button>
                ))}
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-1">
              {container.l} × {container.w} × {container.h} cm · max {container.maxWeight} kg
            </p>
            {containerKey === 'fbapal' && (
              <p className="text-xs text-amber-600 mt-1">Amazon FBA: 72" total height, 680 kg, zero overhang — allowance locked to none. Amazon rejects hundreds of pallets a day for bad stacking.</p>
            )}
            {container.group === 'Pallets' && containerKey !== 'fbapal' && (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span>Overhang allowance</span>
                {[0, 2.5, 5].map((ov) => (
                  <button
                    key={ov}
                    onClick={() => { if(ov===overhangCm)return; setOverhangCm(ov); regen('overhang'); }}
                    className={`px-2 py-0.5 rounded ${overhangCm === ov ? 'bg-teal-600 text-white' : 'bg-slate-100'}`}
                  >
                    {ov === 0 ? 'none' : `${ov} cm/side`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Carton types (cm / kg)</span>
              <div className="flex gap-3">
                <button onClick={() => { setImportOpen(true); track('import_open'); }} className="text-xs text-emerald-700 font-semibold">
                  ⬆ Import Excel/CSV
                </button>
                <button onClick={addSpec} className="text-xs text-blue-600 font-medium">+ Add</button>
              </div>
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
                <div className="grid grid-cols-5 gap-1">
                  {(['l', 'w', 'h', 'weight', 'qty'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] uppercase text-slate-400">{k === 'weight' ? 'kg' : k}</label>
                      <input
                        type="number"
                        min={k === 'weight' ? 0 : 1}
                        value={s[k] as number}
                        onChange={(e) => updateSpec(s.id, { [k]: Math.max(k === 'weight' ? 0 : 1, Number(e.target.value) || 0) })}
                        className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={s.maxStack === 0}
                      onChange={(e) => updateSpec(s.id, { maxStack: e.target.checked ? 0 : undefined })}
                    />
                    Fragile (no stack on top)
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!s.keepUpright}
                      onChange={(e) => updateSpec(s.id, { keepUpright: e.target.checked })}
                    />
                    This way up
                  </label>
                  <label className="flex items-center gap-1" title="Crush limit: max total weight resting on ONE carton. 'est.' uses the McKee formula for a single-wall ECT-32 box with safety factor 4 — check your board grade.">
                    Max on top
                    <input
                      type="number"
                      min={0}
                      value={s.maxStack === 0 ? '' : s.maxStack ?? ''}
                      placeholder="∞"
                      disabled={s.maxStack === 0}
                      onChange={(e) => updateSpec(s.id, { maxStack: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })}
                      className="w-14 text-xs px-1 py-0.5 rounded border border-slate-200"
                    />
                    kg
                    <button
                      onClick={() => updateSpec(s.id, { maxStack: Math.round(mckeeSafeLoad(32, s.l, s.w)) })}
                      className="px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px]"
                      title="Estimate from McKee formula (ECT-32 single-wall, SF 4)"
                    >est.</button>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Group</label>
                    <input
                      value={s.group ?? ''}
                      placeholder="(keep together)"
                      onChange={(e) => updateSpec(s.id, { group: e.target.value || undefined })}
                      className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Unload # (1=door)</label>
                    <input
                      type="number"
                      min={1}
                      value={s.unloadOrder ?? ''}
                      placeholder="—"
                      onChange={(e) => updateSpec(s.id, { unloadOrder: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
                      className="w-full text-sm px-1 py-0.5 rounded border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => hasInputChanges ? regen() : packing.retry()}
            disabled={packing.status === 'running' || !hasPendingChanges}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            Optimise pack
          </button>

          {!packing.ready && <div role="status" aria-live="polite" className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
            {packing.status === 'running' ? <>
              <p>{packing.phase === 'packing' ? T('Calculating your load… You can keep editing inputs.', '正在計算裝載方案…你可以繼續修改輸入。') : packing.phase === 'improving' ? T('Comparing carton arrangements…', '正在比較紙箱排列組合…') : T('Checking the improved layout…', '正在檢查改善後嘅擺位…')}</p>
              <button type="button" className="mt-2 underline" onClick={packing.cancel}>{T('Cancel calculation', '取消計算')}</button>
            </> : <p>{packing.status === 'cancelled' ? T('Calculation cancelled. Select Optimise pack to try again.', '已取消計算，按 Optimise pack 重新計算。') : T('Calculation could not finish. Select Optimise pack to retry.', '計算未能完成，按 Optimise pack 重試。')}</p>}
          </div>}
          {!hasPendingChanges && <p role="status" className="text-xs text-slate-600">{T('Plan is up to date. Export your current layout, or change inputs to recalculate. Use Reset to auto below the 3D view to undo manual placement; Undo can restore it.','方案已更新，可以匯出目前擺位；修改輸入後才需重新計算。要取消手動擺位，請用 3D 下方「重設自動擺位」；亦可按「復原」還原。')}</p>}
          {hasInputChanges && (
            <p role="status" data-testid="planner-pending-changes" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {T('Inputs changed. The view and totals still show your last calculated plan. Select Optimise pack to update it before exporting, sharing or saving.', '輸入已修改。畫面與總數仍顯示上次計算嘅方案。請按 Optimise pack 更新後，再匯出、分享或保存。')}
            </p>
          )}
          {exportError && <p role="alert" className="text-xs text-red-600">{exportError}</p>}


        </div>

        {/* right: 3D editor */}
        <div className="min-w-0 lg:sticky lg:top-28 xl:top-20 self-start" data-testid="planner-sticky-view">
          {packing.ready && <>
          <section aria-label={T('Load results', '裝載結果')} className="mb-2 rounded-xl border border-blue-200 bg-white p-2.5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div><h2 className="text-sm font-bold text-slate-900">{T('Load results', '裝載結果')}</h2><p className="text-xs text-slate-500">{CONTAINERS[containerKey].label} · {packSpace.l} × {packSpace.w} × {packSpace.h} cm</p></div>
              <button type="button" aria-expanded={resultDetails} aria-controls="planner-result-detail" onClick={()=>setResultDetails(v=>!v)} className="text-xs font-semibold text-blue-700 px-2 py-1 rounded border border-blue-200">{resultDetails ? T("Less detail", "收起詳情") : T("More detail", "展開詳情")}</button>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hasInputChanges ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{hasInputChanges ? T('Previous plan · inputs changed', '上次方案 · 輸入已修改') : liveBoxes ? T('Manually adjusted layout', '手動調整擺位') : sharedBoxes ? T('Shared layout', '分享擺位') : T('Calculated layout', '已計算擺位')}</span>
            </div>
            {!resultDetails && <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs" data-testid="planner-result-compact">
              <div><span className="text-slate-500">{T('Loaded','已裝')}</span> <strong data-testid="planner-packed" className="text-slate-900 tabular-nums">{currentBoxes.length} / {totalQty}</strong></div>
              <div><span className="text-slate-500">{T('Remaining','未裝')}</span> <strong className="text-amber-800">{Math.max(0,totalQty-currentBoxes.length)}</strong></div>
              <div><span className="text-slate-500">{T('Volume','空間')}</span> <strong>{stats.volumeUtil.toFixed(1)}%</strong></div>
              <div><span className="text-slate-500">{T('Cargo','貨重')}</span> <strong>{stats.totalWeight.toLocaleString(undefined,{maximumFractionDigits:0})} kg</strong>{appliedSpecs.some(s=>s.weightKnown===false)&&<span className="text-amber-800"> · {T('Incomplete','未完整')}</span>}</div>
            </div>}
            {resultDetails && <div id="planner-result-detail">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2" data-testid="planner-result-cards">
              <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs font-medium text-blue-800">{T('Cartons loaded', '已裝箱數')}</p><p data-testid={resultDetails ? "planner-packed" : undefined} className="mt-1 text-xl font-bold text-blue-950 tabular-nums">{currentBoxes.length} / {totalQty}</p><p className="mt-1 text-xs text-blue-700">{T('Loaded / requested', '已裝 / 要求數量')}</p></div>
              <div className={`rounded-lg p-3 ${totalQty > currentBoxes.length ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}><p className="text-xs font-medium">{T('Cartons remaining', '未裝箱數')}</p><p className="mt-1 text-xl font-bold tabular-nums">{Math.max(0,totalQty-currentBoxes.length)}</p><p className="mt-1 text-xs">{totalQty > currentBoxes.length ? T('Review fit & loading rules', '檢查尺寸及裝載限制') : T('All requested cartons fit', '全部要求箱數已裝入')}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-medium text-slate-600">{T('Volume utilization', '空間利用率')}</p><p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{stats.volumeUtil.toFixed(1)}%</p><div className="h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden" aria-hidden="true"><div className="h-full bg-blue-600" style={{width:`${Math.min(100,Math.max(0,stats.volumeUtil))}%`}}/></div><p className="mt-1 text-xs text-slate-500">{T('Of internal volume', '佔內部容積')}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-medium text-slate-600">{T('Loaded cargo weight', '已裝貨物重量')}</p><p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{stats.totalWeight.toLocaleString(undefined,{maximumFractionDigits:0})} <span className="text-sm">kg</span></p><p className={`mt-1 text-xs ${appliedSpecs.some(s=>s.weightKnown===false) || (stats.weightUtil??0)>100 ? 'text-amber-800' : 'text-slate-500'}`}>{appliedSpecs.some(s=>s.weightKnown===false) ? T('Incomplete · missing weights', '未完整 · 部分箱重欠缺') : stats.weightUtil != null ? `${stats.weightUtil.toFixed(1)}% ${T('of payload limit', '佔載重上限')}` : T('Payload limit not set', '未設定載重上限')}</p></div>
            </div>
            {!liveBoxes && !sharedBoxes && result.optimization.addedCount > 0 && <div className="mt-3"><PackingGain baseline={result.optimization.baselineCount} loaded={result.boxes.length} zh={IS_ZH}/></div>}
            </div>}
          </section>
          <div className="flex items-center justify-between gap-2 text-xs mb-2"><span className="text-slate-500">{T("Auto rotation pauses while a carton is selected and follows reduced-motion settings.", "選取紙箱時會暫停自動旋轉，亦會遵從減少動態效果設定。")}</span><button type="button" aria-pressed={rotateView} onClick={()=>setRotateView(v=>!v)} className="shrink-0 border rounded px-2 py-1 text-blue-700">{rotateView ? T("Pause rotation", "暫停旋轉") : T("Auto rotate", "自動旋轉")}</button></div>
          <InteractiveLoadPlanner
            viewportAspectRatio="16 / 10"
            lightTheme
            autoSpin={rotateView}
            viewportHeight={resultDetails ? "min(62.5vw, clamp(180px, calc(100dvh - 540px), 360px))" : "min(62.5vw, clamp(220px, calc(100dvh - 350px), 520px))"}
            hideSummary
            flagIds={[...new Set(review.issues.flatMap(i=>i.ids))]}
            key={`${containerKey}-${seed}-${selectedLayout}-${sharedBoxes ? shareId : ''}`}
            container={packSpace}
            boxes={sharedBoxes ?? result.boxes}
            grid={1}
            unitLabel="cm"
            onChange={setLiveBoxes}
            onAction={(action,outcome)=>track('planner_edit',`${action}:${outcome}`)}
            registerSnapshot={(fn) => { snapshotFn.current = fn; }}
          />
</>} 
          {!packing.ready && <div className="min-h-96 rounded-xl border bg-slate-50 flex items-center justify-center text-slate-600">{T('Your 3D layout will appear when calculation finishes.', '計算完成後會顯示 3D 擺位。')}</div>}
        </div>
      </div>

      {packing.ready && <div className="mt-4 space-y-3"><PlannerReviewPanel review={review} zh={IS_ZH}/>
          {packing.ready && <div data-testid="planner-load-checks" className="text-sm text-slate-600 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">{T("Load checks & distribution", "裝載檢查與分佈")}</h3>
            {doorBlocked.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-1">
                🚪 <b>Won't fit through the door:</b> {doorBlocked.map((s) => s.label).join(', ')} — the {CONTAINERS[containerKey].label} door aperture is {CONTAINERS[containerKey].door!.w}×{CONTAINERS[containerKey].door!.h} cm (smaller than the interior). Rotate, resize, or allow a different orientation.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{T('Horizontal CoG offset','水平重心偏移')}</p>
                <p className={`mt-1 font-semibold ${balanceWarn ? 'text-amber-700' : 'text-green-700'}`}>{balanceWarn ? T('Outside centre band','超出中心範圍') : T('Within centre band','位於中心範圍')}</p>
                <p className="mt-1 text-xs tabular-nums">{T('Length','長度方向')} {stats.cogOffsetPct.x >= 0 ? '+' : ''}{stats.cogOffsetPct.x.toFixed(0)}% · {T('Width','寬度方向')} {stats.cogOffsetPct.z >= 0 ? '+' : ''}{stats.cogOffsetPct.z.toFixed(0)}%</p>
              </div>
              {'tare' in container && container.tare != null && <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{T('VGM estimate · cargo + tare','VGM 估算 · 貨物＋櫃重')}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{(stats.totalWeight + container.tare).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</p>
                <p className="mt-1 text-xs">{T('Includes','包括')} {container.tare.toLocaleString()} kg {T('container tare','貨櫃淨重')}</p>
                {appliedSpecs.some(s=>s.weightKnown===false)&&<p className="mt-1 text-xs text-amber-800">{T('Incomplete · some carton weights are missing','未完整 · 部分箱重欠缺')}</p>}
              </div>}
            </div>
            {topHeavy && cogH && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⚠️ <b>Top-heavy load:</b> centre of gravity sits at {cogH.pct.toFixed(0)}% of the load height — braking and cornering work on a long lever. Move heavy cartons to the floor.
              </div>
            )}
            {stackWarn.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                🧱 <b>{stackWarn.length} heavy-on-light stack{stackWarn.length === 1 ? '' : 's'}:</b> a carton ≥25% heavier than the one beneath it crushes goods. Re-order the stack — heavy at the bottom.
              </div>
            )}
            {axles && 'axles' in container && container.axles && (
              <>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3 rounded-lg bg-slate-50 p-3">
                  <span>Front axle group</span>
                  <span className={`font-semibold ${axles.frontOver ? 'text-red-600' : 'text-green-600'}`}>
                    {(axles.front / 1000).toFixed(1)} t / {(container.axles.frontLimit / 1000).toFixed(1)} t
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3 rounded-lg bg-slate-50 p-3">
                  <span>Rear axle group</span>
                  <span className={`font-semibold ${axles.rearOver ? 'text-red-600' : 'text-green-600'}`}>
                    {(axles.rear / 1000).toFixed(1)} t / {(container.axles.rearLimit / 1000).toFixed(1)} t
                  </span>
                </div>
                {(axles.frontOver || axles.rearOver) && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    ⚖️ <b>Axle overload:</b> weight sits too far {axles.frontOver ? 'forward' : 'back'} — slide heavy cartons toward the {axles.frontOver ? 'rear' : 'front'} and re-check. Typical legal splits shown; verify your rig's plated limits.
                  </div>
                )}
              </>
            )}
            {overhang && overhang.ids.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                📦 <b>{overhang.ids.length} carton{overhang.ids.length === 1 ? '' : 's'} overhang</b> the pallet by up to {overhang.maxCm.toFixed(1)} cm — stretch-wrap tightly; overhang cuts carton compression strength ≈ 30%.
              </div>
            )}
            {voidWarn && voids && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                🚚 <b>Load-shift risk:</b> {voids.doorSlack > 15 ? `${voids.doorSlack.toFixed(0)} cm free run at the door` : ''}{voids.doorSlack > 15 && voids.biggestGap > 15 ? ' + ' : ''}{voids.biggestGap > 15 ? `a ${voids.biggestGap.toFixed(0)} cm gap mid-stow` : ''}. Brace the last rows or fill the gap with dunnage airbags — slack is where cargo slams during braking and sea motion.
              </div>
            )}
            {!liveBoxes && !sharedBoxes && result.zones.length > 1 && (
              <section className="border-t border-slate-100 pt-3" aria-label={T('Load zones','裝卸分區')}>
                <div className="flex items-center justify-between gap-3 text-xs font-medium"><span>{T('Load zones (back → door)','裝卸分區（櫃尾 → 櫃門）')}</span><span className="shrink-0 rounded bg-green-100 px-2 py-1 text-green-800">{T('DOOR','櫃門')}</span></div>
                <div className="flex h-3 gap-0.5 my-2 overflow-hidden rounded-full" aria-hidden="true">
                  {result.zones.map((z,i)=><div key={z.unloadOrder} className={['bg-blue-500','bg-teal-500','bg-violet-500'][i%3]} style={{flexBasis:0,flexGrow:Math.max(1,z.xEnd-z.xStart)}}/>)}
                </div>
                <ul className="grid gap-2 sm:grid-cols-2" data-testid="planner-zone-labels">
                  {result.zones.map((z,i)=><li key={z.unloadOrder} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-sm ${['bg-blue-500','bg-teal-500','bg-violet-500'][i%3]}`}/><span className="whitespace-nowrap">{T('Unload','卸貨順序')} #{z.unloadOrder}</span></span>
                    <strong className="whitespace-nowrap text-slate-700 tabular-nums">{z.count} {T('cartons','箱')}</strong>
                  </li>)}
                </ul>
              </section>
            )}
            {totalQty > currentBoxes.length && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-semibold">{totalQty - currentBoxes.length} {T('carton(s) not placed','箱未裝入')}</p>
                <p className="mt-1 text-xs leading-relaxed">{T('Check dimensions, payload and stacking rules, or compare a larger container.','請檢查尺寸、載重及堆疊限制，或比較較大櫃型。')}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">{T('Recalculating unchanged inputs gives the same result.','輸入不變，重新計算結果亦相同。')}</p>
              </div>
            )}
            {stats.weightUtil != null && stats.weightUtil > 100 && (
              <p className="text-xs text-red-600">Over the container payload limit.</p>
            )}
          </div>}
          </div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2 items-start" aria-label={T('Export and manage your plan', '匯出及管理方案')}>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <h2 className="font-bold text-slate-900">{T('Export & compare', '匯出與比較')}</h2>
          <section className="rounded border p-3 space-y-2 text-sm"><label className="block">{T('Report reference (optional)','報告參考編號（可略過）')}<input className="border rounded p-2 w-full" maxLength={120} value={reportName} onChange={e=>setReportName(e.target.value)}/></label><label className="block">{T('Report for','報告對象')}<select className="border rounded p-2 w-full" value={reportView} onChange={e=>setReportView(e.target.value as PlannerReportView)}><option value="summary">{T('Customer — summary','客戶 — 摘要')}</option><option value="crew">{T('Warehouse — loading steps','倉庫 — 裝載步驟')}</option><option value="manifest">{T('Forwarder — reconciliation and positions','貨代 — 對數及位置')}</option></select></label><p className="text-xs break-all">{T('Revision','版本')}: {revision}</p></section>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              disabled={hasPendingChanges}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} /> CSV
            </button>
            <button
              onClick={exportPdf}
              disabled={hasPendingChanges}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={15} /> PDF plan
            </button>
          </div>

          <p data-testid="export-email-notice" className="text-xs text-slate-500">{IS_ZH ? '免費匯出會要求提供電郵；產品更新可自行選擇訂閱。' : 'Free export asks for an email. Product updates are optional.'}</p>
          <Link to="/order-quote" className="block rounded border p-2 text-sm text-center" aria-disabled={hasPendingChanges} onClick={e=>transferCargo(e,'quote')}>{T('Use this carton list for pallet quoting','用此散箱貨單計算卡板報價')}</Link>
          <Link to="/consolidation" className="block rounded border border-teal-300 p-2 text-sm text-center text-teal-900" aria-disabled={hasPendingChanges} onClick={e=>transferCargo(e,'compare')}>{T('Compare containers for this cargo','比較此貨單的櫃型')}</Link>
          <p className="text-xs text-slate-600">{T('Your current layout is saved locally before comparison. Compare the same quantities and rules; costs need your own quotes.','比較前會在本機保存目前擺位。沿用相同數量及限制；成本需提供自己的報價。')}</p>
          {appliedSpecs.some(s=>s.weightKnown===false)&&<p role="alert" className="text-amber-800 text-sm">{T('Some carton weights are missing. Weight and payload totals are incomplete; enter weights and optimise again before exporting.','部分箱重未提供，重量及載重合計不完整；請填寫並重新計算再匯出。')}</p>}
        </section>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <h2 className="font-bold text-slate-900">{T('Save & share this job', '保存與分享工作')}</h2>
          <WorkflowJob job={workflowJob} onChange={next=>{if(next.id!==workflowJob.id){if(hasPendingChanges){setHistoryMessage(T('Calculate pending edits before starting another job.','開始新工作前，請先計算待處理修改。'));return;}if(!preserve())return;setReportName('');setLiveBoxes(null);setSharedBoxes(null);setSeed(n=>n+1);}setWorkflowJob(next);}}/>
          <details className="rounded border p-3 text-sm"><summary className="cursor-pointer font-semibold">{T('Saved versions on this device','本機保存版本')}</summary><p className="text-xs my-2">{T('Keeps the latest 20 snapshots in this browser. Reopen a version to revise the same job; use Start next job for another shipment. New jobs keep cargo rules but recalculate positions.','在此瀏覽器保留最近 20 個快照。重開版本可修訂同一工作；另一批出貨請開始新工作。新工作沿用貨物限制，但會重新計算擺位。')}</p><button className="border rounded p-2" disabled={hasPendingChanges} onClick={preserve}>{T('Save this version locally','在本機保存此版本')}</button>{historyMessage&&<p role="status">{historyMessage}</p>}<ul>{[...history].reverse().map(v=>{const diff=snapshotChanges(v,currentSnapshot());return <li key={v.jobId+v.revision} className="border-t py-2"><p>{v.name||v.jobId.slice(0,8)} · {v.revision.slice(0,8)} · {new Date(v.savedAt).toLocaleString()}</p><p>{T('Compared with current:','與目前比較：')} {diff.cargoRows} {T('cargo rows changed','貨物行有變')} · {diff.equipment?T('equipment changed','櫃型有變'):T('same equipment','相同櫃型')} · {diff.layout?T('layout changed','擺位有變'):T('same layout','相同擺位')}</p><button className="border rounded p-2" disabled={hasPendingChanges} onClick={()=>{if(preserve())restore(v);}}>{T('Reopen version','重開版本')}</button></li>})}</ul></details>
          <ShareSnapshot disabled={hasPendingChanges} path={IS_ZH?'/zh/planner':'/planner'} payload={()=>({containerKey,container,specs:appliedSpecs,boxes:currentBoxes,overhangCm,reportName,jobId:workflowJob.id})}/>


          {accountMessage && <p role="status" className="text-sm text-blue-800">{accountMessage}</p>}
          {auth.enabled && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
            <h3 className="font-semibold">{T('My plans & templates','我的方案與模板')}</h3>
            <p className="text-xs text-slate-600">{T('Save named jobs or reusable cargo templates to your private account. Templates start a new calculation; your original is kept. Only plans you choose to save are uploaded.','將命名工作或常用貨單模板保存到私人帳戶。模板會開始新的計算，原本記錄保留；只有選擇保存的方案會上傳。')}</p>
            <Link to="/plans" onClick={e=>{if(hasPendingChanges){e.preventDefault();setAccountMessage(T('Calculate pending changes before opening your account so this work can be saved.','請先計算待處理修改，保存工作後再開啟帳戶。'));}else if(!preserve())e.preventDefault();}} className="inline-block font-semibold text-blue-700 underline">{auth.userId ? T('Open my plans & templates','開啟我的方案與模板') : T('Create account / sign in','建立帳戶／登入')}</Link>
            <p className="text-xs">{T('Your current calculated plan is saved on this device before opening your account.','開啟帳戶前會在本機保存目前已計算方案。')}</p>
            {auth.userId && <><label className="block text-sm">{T('Job or template name','工作或模板名稱')}<input className="w-full rounded border p-2 mt-1" maxLength={120} value={accountName} onChange={e=>setAccountName(e.target.value)}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveAsTemplate} onChange={e=>setSaveAsTemplate(e.target.checked)}/>{T('Save as reusable template','存為常用模板')}</label></>}
          </div>}
          {auth.enabled && (
            auth.userId ? (
              <button
                onClick={saveToAccount}
                disabled={hasPendingChanges || saveState === 'busy'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  saveState === 'saved'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : saveState === 'error'
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {saveState === 'saved'
                  ? (<><Check size={15} /> Saved — see My Plans</>)
                  : saveState === 'error'
                    ? 'Save failed — try again'
                    : (<><Save size={15} /> {saveState === 'busy' ? 'Saving…' : 'Save to my plans'}</>)}
              </button>
            ) : null
          )}

        </section>
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <summary className="cursor-pointer font-bold text-slate-900">{T('Planner guide & frequently asked questions', '使用指南與常見問題')}</summary>
        <section className="pt-4" aria-labelledby="load-plan-guide">
        <h2 id="load-plan-guide" className="text-xl font-bold text-slate-900">{T('From Excel packing list to a 3D load plan', '由 Excel 貨單到 3D 裝櫃計劃')}</h2>
        <p className="mt-2 text-sm text-slate-600">{T('For exporters, freight forwarders and warehouse teams checking a shipment before loading. Planning needs no account; free PDF and CSV export asks for an email. Product updates are optional.', '適合出口商、貨運代理及倉庫團隊裝貨前核對。規劃毋須帳戶；免費 PDF 與 CSV 匯出需填電郵，產品消息可自行選擇。')}</p>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3 text-sm text-slate-600">
          <li><h3 className="font-semibold text-slate-900">{T('1. Review your cargo', '1. 核對貨單')}</h3><p className="mt-1">{T('Import Excel or CSV, choose the worksheet and map your columns. Check units, accepted quantities and excluded rows before calculating. The CSV template uses cm and kg.', '匯入 Excel 或 CSV，選擇工作表及對應欄位。計算前核對單位、接受數量及排除行。CSV 範本使用 cm 及 kg。')}</p></li>
          <li><h3 className="font-semibold text-slate-900">{T('2. Calculate and inspect', '2. 計算並檢查')}</h3><p className="mt-1">{T('Choose the container and set fragile, upright and stacking rules. Optimise, rotate the view and check unplaced cartons, payload and balance. A packing estimate is not a certified loading or securing plan.', '選擇貨櫃並設定易碎、直立及堆疊規則。最佳化後旋轉視圖，檢查未裝入箱數、載重及平衡。裝載估算並非經認證的裝貨或固定方案。')}</p></li>
          <li><h3 className="font-semibold text-slate-900">{T('3. Hand off the result', '3. 交付結果')}</h3><p className="mt-1">{T('Export a PDF plan or CSV placement list, or share a snapshot for review. For pallet shipments, send the same carton list to pallet quoting using the action above.', '匯出 PDF 裝載圖或 CSV 位置表，亦可分享快照供核對。棧板貨物可用上方按鈕將同一貨單帶入棧板報價流程。')}</p></li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setImportOpen(true); track('planner_guide_action', 'import'); }}>{T('Import my packing list', '匯入我的貨單')}</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { downloadText('dimpack3d-template.csv', TEMPLATE_CSV); track('planner_guide_action', 'template'); }}>{T('Download CSV template (cm / kg)', '下載 CSV 範本（cm／kg）')}</button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <details><summary className="cursor-pointer font-semibold text-slate-900">{T('Why do some cartons remain unplaced?', '為何有部分紙箱未能裝入？')}</summary><p className="mt-2">{T('Available volume alone does not determine fit. Carton dimensions, door clearance, orientation, payload and stacking rules can limit the result. Review the highlighted constraints and recalculate after edits; the heuristic does not guarantee the mathematical optimum.', '體積足夠不代表一定放得下。箱尺寸、櫃門淨空、方向、載重及堆疊規則都會影響結果。核對提示並在修改後重新計算；啟發式演算法不保證數學上的最佳解。')}</p></details>
          <details><summary className="cursor-pointer font-semibold text-slate-900">{T('Which container dimensions should I use?', '應採用哪個貨櫃尺寸？')}</summary><p className="mt-2">{T('The 20ft GP, 40ft GP and 40ft HQ presets are planning assumptions. Confirm your actual equipment dimensions, door opening and permitted payload with the carrier before loading.', '20 呎 GP、40 呎 GP 及 40 呎 HQ 預設值是規劃假設。裝貨前請向承運人確認實際內尺寸、櫃門及允許載重。')}</p></details>
        </div>
        <nav aria-label={T('Related loading tools', '相關裝載工具')} className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
          <Link to="/guides/excel-container-load-plan">{T('Excel import: worked example →', 'Excel 匯入：完整實例 →')}</Link>
          <Link to="/pallets-per-container">{T('Pallets per container →', '每櫃棧板數 →')}</Link>
          <Link to="/ti-hi-calculator">{T('Cases per pallet: TI / HI →', '每板箱數：TI／HI →')}</Link>
          <Link to="/container">{T('Quick container capacity check →', '快速核對貨櫃容量 →')}</Link>
        </nav>
      </section></details>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />

      <PaywallModal
        open={paywallOpen}
        onClose={closeExportGate}
        onSubmit={onUnlock}
        auth={auth.enabled && checkoutEnabled ? {
          enabled: true,
          isSignedIn: !!auth.userId,
          email: auth.email,
          isPro: auth.isPro,
          onSignIn: auth.signInWithEmail,
          onUpgrade: auth.startCheckout,
          onSignOut: auth.signOut,
        } : undefined}
      />
      <ExportFeedback tool="planner" format={feedbackFormat} onClose={()=>setFeedbackFormat(null)}/>
    </div>
  );
}
