import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { StickyResult, StickySpacer, CopyLink, Accordion } from '../components/calc/CalcUx';
import PalletChain from '../components/PalletChain';
import { readCarry, seedNum, seedStr, withCarry } from '../lib/palletChainState';

/**
 * /pallets-per-container — "how many pallets fit in a 40ft container"
 * (~390/mo) + "40ft container capacity" + a full internal-dimensions table
 * for the "20ft container dimensions" cluster (~590/mo).
 * Floor fit = best of the two single orientations and the two-lane mixed
 * pattern (one lane crosswise + one lengthwise) — reproduces the published
 * industry counts exactly: EUR 11 / 25, GMA 9 / 20 in 20'/40'.
 */

const CONTAINERS = [
  { key: '20gp', label: "20' GP", l: 589, w: 235, h: 239, door: { w: 234, h: 228 }, payload: 28200, tare: 2300 },
  { key: '40gp', label: "40' GP", l: 1203, w: 235, h: 239, door: { w: 234, h: 228 }, payload: 26700, tare: 3750 },
  { key: '40hq', label: "40' HQ", l: 1203, w: 235, h: 269, door: { w: 234, h: 258 }, payload: 26500, tare: 3900 },
] as const;

const PALLET_TYPES = [
  { key: 'eur', label: 'EUR / EPAL — 120 × 80 cm', l: 120, w: 80 },
  { key: 'gma', label: 'US GMA — 48 × 40 in (121.92 × 101.6 cm)', l: 121.92, w: 101.6 },
  { key: 'ind', label: 'Industrial — 120 × 100 cm', l: 120, w: 100 },
] as const;

const EPS = 1e-6; // float-noise tolerance on exact imperial dims

// best of: both single block orientations + the two-lane mixed pattern
// (lane of crosswise pallets + lane of lengthwise pallets side by side)
function floorFit(pl: number, pw: number, CL: number, CW: number) {
  const a = Math.floor(CW / pw + EPS) * Math.floor(CL / pl + EPS);
  const b = Math.floor(CW / pl + EPS) * Math.floor(CL / pw + EPS);
  const mixed = pl + pw <= CW ? Math.floor(CL / pw + EPS) + Math.floor(CL / pl + EPS) : 0;
  return Math.max(a, b, mixed);
}

/** Top-view of the 40' floor — the two-lane mixed pattern drawn to scale,
 *  so "25 EUR pallets" stops being a magic number. */
function FloorPattern({ pl, pw }: { pl: number; pw: number }) {
  const CL = 1203, CW = 235;
  const W = 560, s = W / CL, H = CW * s, pad = 4;
  const rects: Array<{ x: number; y: number; w: number; h: number; lane: number }> = [];
  if (pl + pw <= CW) {
    for (let i = 0; i < Math.floor(CL / pw + 1e-6); i++) rects.push({ x: i * pw, y: 0, w: pw, h: pl, lane: 0 });
    for (let i = 0; i < Math.floor(CL / pl + 1e-6); i++) rects.push({ x: i * pl, y: pl, w: pl, h: pw, lane: 1 });
  } else {
    const cols = Math.floor(CL / pl + 1e-6), rows = Math.floor(CW / pw + 1e-6);
    for (let r0 = 0; r0 < rows; r0++) for (let c = 0; c < cols; c++) rects.push({ x: c * pl, y: r0 * pw, w: pl, h: pw, lane: r0 % 2 });
  }
  return (
    <svg viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`} className="w-full max-w-[600px]" role="img" aria-label={`40 ft container floor pattern, ${rects.length} pallets`}>
      <rect x={pad} y={pad} width={W} height={H} rx={3} className="fill-slate-100 stroke-slate-400" strokeWidth={1.5} />
      {rects.map((r0, i) => (
        <rect key={i} x={pad + r0.x * s + 0.8} y={pad + r0.y * s + 0.8} width={r0.w * s - 1.6} height={r0.h * s - 1.6} rx={1.5}
          className={r0.lane === 0 ? 'fill-amber-200 stroke-amber-500' : 'fill-blue-200 stroke-blue-500'} strokeWidth={0.8} />
      ))}
      <text x={pad + W - 4} y={pad + H - 5} textAnchor="end" className="fill-slate-400" fontSize={9}>{`40' · ${rects.length} pallets`}</text>
    </svg>
  );
}

export default function PalletsPerContainerPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const carryIn = readCarry(params);
  const [palletKey, setPalletKey] = useState<string>(() => seedStr(params.get('p'), carryIn.pt, 'eur'));
  const [loadedH, setLoadedH] = useState(() => Math.max(10, seedNum(params.get('h'), carryIn.lh, 150)));
  const [wtEach, setWtEach] = useState(() => Math.max(0, Number(params.get('wt')) || 500));

  useEffect(() => {
    setParams(withCarry({ p: palletKey, h: String(loadedH), wt: String(wtEach) }, carryIn), { replace: true });
  }, [palletKey, loadedH, wtEach, setParams]);
  useEffect(() => { track('tool_pallets_container'); }, []);

  const pallet = PALLET_TYPES.find((p) => p.key === palletKey) ?? PALLET_TYPES[0];

  const rows = useMemo(() => CONTAINERS.map((c) => {
    // the door header, not the ceiling, is what a loaded pallet must clear —
    // a pallet taller than the aperture cannot enter at all
    const passesDoor = loadedH <= c.door.h;
    const floor = passesDoor ? floorFit(pallet.l, pallet.w, c.l, c.w) : 0;
    const tiers = passesDoor ? Math.floor(c.h / loadedH) : 0;
    const byVolume = floor * tiers;
    const byWeight = wtEach > 0 ? Math.floor(c.payload / wtEach) : Infinity;
    const total = Math.max(0, Math.min(byVolume, byWeight));
    return { c, floor, tiers, byVolume, total, passesDoor, weightLimited: passesDoor && byWeight < byVolume };
  }), [pallet, loadedH, wtEach]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('How Many Pallets Fit in a Container? — 20ft & 40ft capacity + dimensions, free | DimPack3D', '一個貨櫃裝到幾多卡板?— 20呎/40呎容量同尺寸 | DimPack3D')}</title>
        <meta name="description" content={T(
          'How many pallets fit in a 20ft or 40ft container: EUR and GMA floor counts (including the mixed-orientation pattern), double-stacking by your loaded pallet height and weight, plus full internal dimensions and door sizes for 20′GP, 40′GP and 40′HQ. Free calculator, no signup.',
          '20呎/40呎貨櫃裝到幾多卡板:歐標同 GMA 地面板數(連混合擺向)、按你嘅裝載高度同重量計雙層堆疊,仲有 20′GP、40′GP、40′HQ 完整內部尺寸同櫃門尺寸。免費計算,唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many pallets fit in a 40ft container?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'On the floor: up to 25 EUR pallets (120 × 80 cm) using the mixed pattern — one lane loaded crosswise and one lengthwise — or 20 single-orientation; in practice 23–24 is common once straps and gaps are allowed for. US GMA 48 × 40 in pallets: 20 on the floor. Double-stacking doubles these if the loaded pallet height fits (≤ ~119 cm in a 40′GP, ~134 cm in a 40′HQ) and the payload allows.',
                },
              },
              {
                '@type': 'Question',
                name: 'How many pallets fit in a 20ft container?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'On the floor: 11 EUR pallets (mixed orientation) or 9 US GMA 48 × 40 in pallets. A 20′GP is 589 cm long × 235 cm wide inside, so EUR pallets run one lane crosswise (7 at 80 cm deep) plus one lane lengthwise (4 at 120 cm deep).',
                },
              },
              {
                '@type': 'Question',
                name: 'Can you double-stack pallets in a container?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, if three limits hold: height — two loaded pallets must fit under 239 cm (GP) or 269 cm (HQ), so each stays under ~119/134 cm including the pallet; strength — the bottom load must carry the top pallet without crushing (top-heavy or fragile freight cannot double-stack); and weight — the container payload (26,500–28,200 kg) caps the total regardless of space.',
                },
              },
              {
                '@type': 'Question',
                name: 'What are the internal dimensions of a 20ft container?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A standard 20′GP is approximately 589 cm long × 235 cm wide × 239 cm high inside (19′4″ × 7′8″ × 7′10″), with a door aperture of about 234 × 228 cm, ~33 m³ of space and a payload around 28,200 kg. Exact figures vary slightly by container maker — check the CSC plate on the unit.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('How Many Pallets Fit in a Container?', '一個貨櫃裝到幾多卡板?')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Floor counts for EUR and GMA pallets in 20′ and 40′ containers — including the mixed-orientation pattern — with double-stacking worked out from your loaded pallet height and weight. Inputs stay in the URL.',
           '歐標同 GMA 卡板喺 20 呎/40 呎櫃嘅地面板數 — 連混合擺向 — 再按你嘅裝載高度同重量計埋雙層堆疊。輸入保存喺網址。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Pallet type', '卡板類型')}</label>
            <select value={palletKey} onChange={(e) => setPalletKey(e.target.value)} className={inputCls}>
              {PALLET_TYPES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Loaded pallet height, cm (incl. pallet)', '裝載高度, cm(連卡板)')}</label>
            <input type="number" min={10} value={loadedH} onChange={(e) => setLoadedH(Math.max(10, Number(e.target.value) || 10))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('≤119 cm double-stacks in a GP; ≤134 cm in a 40′HQ.', '≤119 cm 喺 GP 可以疊兩層;≤134 cm 喺 40 呎 HQ。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Weight per loaded pallet, kg', '每板重量, kg')}</label>
            <input type="number" min={0} value={wtEach} onChange={(e) => setWtEach(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-bold text-slate-900">{T('Container', '貨櫃')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Floor', '地面')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Tiers', '層')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Total pallets', '總板數')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, floor, tiers, total, passesDoor, weightLimited }, i) => (
                <tr key={c.key} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : ''}`}>
                  <td className="p-3 font-semibold">{c.label}</td>
                  <td className="p-3 text-slate-600">{floor}</td>
                  <td className="p-3 text-slate-600">{tiers}</td>
                  <td className="p-3">
                    <b className="text-slate-900">{total}</b>
                    {!passesDoor && <span className="text-red-600 text-xs font-semibold ml-2">{T(`won't pass the ${c.door.h} cm door`, `過唔到 ${c.door.h} cm 櫃門`)}</span>}
                    {weightLimited && <span className="text-amber-600 text-xs font-semibold ml-2">{T('weight-limited', '受重量限制')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2">
            {T('Floor count = best of single-orientation and mixed two-lane patterns. Practical loads often give up 1–2 positions for straps, dunnage and door clearance. Double-stacking also needs the bottom load to carry the top pallet.',
               '地面板數 = 單一擺向同雙行混合擺向取較多者。實際裝櫃通常因綁帶、填充物同櫃門位讓出 1–2 個位。雙層堆疊仲要底層頂得起上層。')}
          </p>

          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{T("40' floor pattern (top view) — amber = crosswise lane, blue = lengthwise", "40 呎地面擺法(俯視)— 橙 = 橫擺行,藍 = 直擺行")}</p>
            <FloorPattern pl={pallet.l} pw={pallet.w} />
          </div>
          <div className="mt-2"><CopyLink toolId="pallets_container" /></div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('Loading loose cartons instead of pallets?', '散箱唔上板?')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('The 3D planner packs mixed cartons into the same containers with weight, stacking and door checks.',
                 '3D planner 幫你將唔同尺寸嘅箱裝入同一啲貨櫃,連重量、堆疊同櫃門檢查。')}
            </p>
            <Link to="/planner" onClick={() => track('tool_pallets_container_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Open the 3D load planner', '開 3D 裝載規劃器')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* dimensions table — the "20ft container dimensions" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">{T('Container internal dimensions', '貨櫃內部尺寸')}</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-bold text-slate-900">{T('Container', '貨櫃')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Internal L × W × H (cm)', '內部 長×闊×高 (cm)')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Door (W × H)', '櫃門 (闊×高)')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Volume', '容積')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Payload', '載重')}</th>
              </tr>
            </thead>
            <tbody>
              {CONTAINERS.map((c, i) => (
                <tr key={c.key} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : ''}`}>
                  <td className="p-3 font-semibold">{c.label}</td>
                  <td className="p-3 text-slate-600">{c.l} × {c.w} × {c.h}</td>
                  <td className="p-3 text-slate-600">{c.door.w} × {c.door.h} cm</td>
                  <td className="p-3 text-slate-600">{((c.l * c.w * c.h) / 1e6).toFixed(1)} m³</td>
                  <td className="p-3 text-slate-600">{c.payload.toLocaleString()} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-slate-500 text-xs mb-8">
          {T('Common planning figures — exact dimensions vary slightly by maker; check the CSC plate. Plan pallet height to the door (228/258 cm), not the ceiling: the door header is the real limit at loading.',
             '常用規劃數值 — 實際尺寸因製造商略有差異,以櫃上 CSC 銘牌為準。堆疊高度要對住櫃門(228/258 cm)計,唔係櫃頂:裝櫃嗰下真正卡你嘅係門楣。')}
        </p>

        <Accordion title={<h2 className="text-lg font-black text-slate-900">{T('The mixed-orientation pattern', '混合擺向點解裝多啲')}</h2>}>
        <ol className="space-y-4">
          {[
            [T('Two lanes, two orientations', '兩行、兩個擺向'),
             T('An EUR pallet is 120 × 80 cm and the container is 235 cm wide — two crosswise (240 cm) don’t fit. But one crosswise lane (120 cm wide) plus one lengthwise lane (80 cm) = 200 cm, and both fit side by side.',
               '歐標板 120 × 80 cm,櫃內闊 235 cm — 兩塊橫擺(240 cm)入唔到。但一行橫擺(佔闊 120 cm)加一行直擺(80 cm)= 200 cm,兩行並排啱啱好。')],
            [T('Each lane packs at its own pitch', '每行按自己嘅深度密排'),
             T('In a 40′ (1,203 cm): the crosswise lane fits 15 pallets at 80 cm pitch, the lengthwise lane 10 at 120 cm — 25 total, versus 20 single-orientation.',
               '40 呎櫃(1,203 cm):橫擺行每 80 cm 一塊裝 15 塊,直擺行每 120 cm 裝 10 塊 — 共 25 塊,單一擺向就得 20。')],
            [T('GMA pallets gain the same way', 'GMA 卡板一樣受惠'),
             T('48 × 40 in (122 × 102 cm): 11 + 9 = 20 in a 40′, 5 + 4 = 9 in a 20′ — matching the counts carriers quote.',
               '48 × 40 吋(122 × 102 cm):40 呎 11 + 9 = 20 塊,20 呎 5 + 4 = 9 塊 — 同承運商報嘅數一致。')],
          ].map(([title, body], i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500 flex-shrink-0" /> {title}
              </p>
              <p className="text-sm text-slate-600 pl-6">{body}</p>
            </li>
          ))}
        </ol>
        </Accordion>

        <div className="text-sm text-slate-500 mt-4">
          {T('Related:', '相關:')}{' '}
          <Link to="/pallet-calculator" className="text-blue-600 hover:underline">{T('Pallet calculator', '卡板計算器')}</Link>
          {' · '}
          <Link to="/pallet-builder" className="text-blue-600 hover:underline">{T('Pallet builder', '卡板砌板工具')}</Link>
          {' · '}
          <Link to="/cbm-calculator" className="text-blue-600 hover:underline">{T('CBM calculator', 'CBM 計算機')}</Link>
          {' · '}
          <Link to="/container" className="text-blue-600 hover:underline">{T('Container quick-calc', '貨櫃快速計算')}</Link>
        </div>
      </section>
      <PalletChain current="/pallets-per-container" carry={{ ...carryIn, pt: palletKey, lh: loadedH }} />
      <StickySpacer />
      <StickyResult label={T("Pallets: 20' / 40' / HQ", "板數 20'/40'/HQ")} value={rows.map((x) => x.total).join(' / ')} />
    </div>
  );
}
