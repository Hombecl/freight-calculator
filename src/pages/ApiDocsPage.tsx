import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PALLET_EXAMPLE } from '../lib/palletEstimate';
import { useApp } from '../context/AppContext';

/**
 * /api-docs — the public bin-packing API. Free-while-beta developer surface,
 * the seed of the "license the engine" path (ENTERPRISE.md), and an AI-agent
 * integration point (documented in llms.txt so agents can discover and call it).
 */

const EXAMPLE_REQ = `curl -X POST https://www.dimpack3d.com/api/pack \\
  -H "Content-Type: application/json" \\
  -d '{
    "container": { "l": 589, "w": 235, "h": 239, "maxWeight": 28200 },
    "items": [
      { "label": "Master carton", "l": 60, "w": 40, "h": 40, "weight": 18, "qty": 120 },
      { "label": "Fragile", "l": 45, "w": 35, "h": 25, "weight": 6, "qty": 30, "maxStack": 0 }
    ]
  }'`;

const EXAMPLE_RESP = `{
  "boxes": [ { "id": "i0-0", "label": "Master carton", "l": 60, "w": 40, "h": 40,
               "px": 0, "py": 0, "pz": 0, "weight": 18 }, … ],
  "unplaced": 0,
  "stats": { "volumeUtil": 78.4, "totalWeight": 2340, "weightUtil": 8.3,
             "cog": { "x": 271, "y": 63, "z": 115 }, "cogOffsetPct": { "x": -8, "z": -2 } },
  "zones": [ { "unloadOrder": 1, "xStart": 0, "xEnd": 589, "count": 150 } ],
  "computeMs": 41,
  "engine": "dimpack3d-extreme-point"
}`;

const FIELDS: [string, string][] = [
  ['container.l/w/h', 'Internal dimensions in cm (required)'],
  ['container.maxWeight', 'Payload limit in kg (optional)'],
  ['items[].l/w/h', 'Item dimensions in cm (required)'],
  ['items[].qty', 'Units of this item (default 1; ≤2,000 total per request)'],
  ['items[].weight', 'kg per unit (optional; enables weight/CoG stats)'],
  ['items[].maxStack', 'Max kg allowed on top; 0 = fragile, nothing stacks on it'],
  ['items[].keepUpright', 'true = never tip on its side ("this way up")'],
  ['items[].allowRotate', 'false = fixed orientation'],
  ['items[].group', 'Keep-together group name (packed contiguously)'],
  ['items[].unloadOrder', '1 = unload first (loaded nearest the door); LIFO zones'],
];

export default function ApiDocsPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('3D Bin Packing API — free REST endpoint for container packing', '3D 裝箱 API — 免費 REST 裝櫃運算接口')} | DimPack3D</title>
        <meta name="description" content={T(
          'Free REST API for 3D bin-packing: POST cartons and a container, get exact placements with weight, stacking, fragile and unload-order constraints. The engine behind DimPack3D.',
          '免費 3D 裝箱 REST API:POST 紙箱同貨櫃,取回精確擺位,支援重量、堆疊、易碎同落貨順序約束。',
        )} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-3">{T('Bin-Packing API', '裝箱 API')}
        <span className="ml-3 text-xs font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-1 rounded-full align-middle">{T('Free beta', '免費 Beta')}</span>
      </h1>
      <p className="text-slate-600 mb-8">
        {T(
          'The same Extreme-Point engine that powers the planner, as one HTTP call. Weight limits, stacking rules, fragile cartons, keep-together groups and multi-stop unload zones — all enforced server-side. On the Bischoff–Ratcliff academic benchmark (300 container-loading instances) the engine averages 80% volume utilization with full stability constraints — run scripts/benchmark.mjs to reproduce. CORS is open: call it from browsers, scripts, or AI agents.',
          '同規劃器一樣嘅 Extreme-Point 引擎,一個 HTTP call 用到。重量限制、堆疊規則、易碎、同組聚集、多站卸貨分區 — 全部服務端執行。喺 Bischoff–Ratcliff 學術基準(300 個貨櫃裝載 instance)引擎平均 80% 容積利用率,連全套穩定性約束。CORS 開放:瀏覽器、腳本、AI agent 都可以調用。',
        )}
      </p>

      <section id="pallet-height" className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-8 scroll-mt-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{T('Estimate a pallet’s loaded height', '估算卡板連底座高度')}</h2>
        <p className="text-slate-600 mb-4">{T('POST /api/pallet-estimate compares three packing approaches and returns the best plan found. Height includes the pallet base. A partial result describes only the cartons placed, not the whole order. Minimum height is not proven.', 'POST /api/pallet-estimate 比較三種擺法，回傳最佳方案。高度包含底座；partial 只代表已放入紙箱，並非整批訂單。結果不是已證明的最低高度。')}</p>
        <Link to="/pallet-height-calculator#api" className="text-blue-700 font-bold underline">{T('Try an order and download a working request →', '輸入訂單並下載請求範例 →')}</Link>
        <pre className="mt-4 p-4 rounded-lg bg-slate-950 text-slate-100 text-xs overflow-x-auto"><code>{JSON.stringify(PALLET_EXAMPLE, null, 2)}</code></pre>
        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <div><dt className="font-bold text-slate-900">pallet</dt><dd>{T('l/w: footprint; baseHeight: empty pallet height; maxHeight: total height cap including base; maxWeight: cargo-only payload. All cm/kg. Limits must be supplied.', 'l/w：底面；baseHeight：空板高度；maxHeight：連底座總高度上限；maxWeight：只計貨物的載重。cm/kg，必須提供限制。')}</dd></div>
          <div><dt className="font-bold text-slate-900">items[]</dt><dd>{T('label, l/w/h, integer qty, positive weight and boolean keepUpright are required. Optional maxStack is the allowed kg on top; 0 prevents stacking. Missing maxStack leaves carton strength unchecked.', '必須提供 label、l/w/h、整數 qty、正數 weight 及布林 keepUpright。可選 maxStack 為上方容許重量，0 表示不可堆疊；未提供則不檢查紙箱承重。')}</dd></div>
          <div><dt className="font-bold text-slate-900">status / loadedHeight / byItem / boxes</dt><dd>{T('complete means all cartons placed; partial means some remain. loadedHeight includes baseHeight. byItem lists requested, placed and remaining counts. boxes uses px/py/pz min-corner positions, with py measured above the pallet deck. cargoWeight excludes pallet tare.', 'complete 表示全部放入；partial 表示尚有餘箱。loadedHeight 包含 baseHeight。byItem 列出訂購、已放入及剩餘數量。boxes 的 px/py/pz 為最小角位置，py 由板面起計。cargoWeight 不含空板重量。')}</dd></div>
          <div><dt className="font-bold text-slate-900">{T('Limits and errors', '限制與錯誤')}</dt><dd>{T('20 types / 200 cartons / 32 KB per request. Free beta: 20/min and 200/day per IP when rate-limit storage is configured. HTTP 400: invalid JSON or fields; 413: body too large; 415: wrong content type; 429: rate limit (Retry-After header). Larger production orders: contact us.', '每次 20 種 / 200 箱 / 32 KB。免費 Beta：設定限流儲存後每 IP 每分鐘 20 次、每日 200 次。400：JSON 或欄位錯誤；413：內容過大；415：類型錯誤；429：限流（Retry-After）。大量訂單請聯絡我們。')}</dd></div>
        </dl>
      </section>

      <h2 className="font-bold text-lg text-slate-900 mb-2">{T('Request', '請求')}</h2>
      <pre className="bg-slate-950 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto mb-6"><code>{EXAMPLE_REQ}</code></pre>

      <h2 className="font-bold text-lg text-slate-900 mb-2">{T('Response', '回應')}</h2>
      <pre className="bg-slate-950 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto mb-6"><code>{EXAMPLE_RESP}</code></pre>

      <h2 className="font-bold text-lg text-slate-900 mb-3">{T('Fields', '欄位')}</h2>
      <div className="rounded-xl border border-slate-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <tbody>
            {FIELDS.map(([f, d]) => (
              <tr key={f} className="border-b border-slate-100 last:border-0">
                <td className="p-3 font-mono text-xs text-blue-700 whitespace-nowrap">{f}</td>
                <td className="p-3 text-slate-600">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 space-y-2 mb-8">
        <p><b>{T('Units', '單位')}:</b> cm / kg. <b>{T('Limits', '限制')}:</b> {T('100 item types, 2,000 total units per request. Positions are min-corner (px, py, pz) with the door at +X.', '每次 100 種箱型、共 2,000 件。位置為最小角 (px, py, pz),櫃門喺 +X 方向。')}</p>
        <p><b>{T('Terms', '條款')}:</b> {T('Free during beta, fair use. Results are estimates — verify critical loads. Volume or commercial licensing:', 'Beta 期間免費,合理使用。結果屬估算 — 重要裝載請核實。批量或商業授權:')} <a className="text-blue-700 font-medium" href="mailto:hello@dimpack3d.com">hello@dimpack3d.com</a></p>
      </div>

      <Link to="/planner" className="text-blue-700 font-bold">{T('Prefer a UI? Open the interactive planner →', '想用介面?打開互動規劃器 →')}</Link>
    </div>
  );
}
