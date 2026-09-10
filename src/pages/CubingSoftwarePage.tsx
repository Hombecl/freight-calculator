import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { Accordion } from '../components/calc/CalcUx';
import competitorsData from '../data/competitors.json';

/**
 * /cubing-software — category page for the highest-value query in our niche.
 *
 * Why this page exists: GSC showed "cubing software" (≈720/mo US, CPC $17 —
 * the most expensive click in the whole logistics-calculator space) already
 * sending impressions to /compare/cube-iq-alternative at position ~60, i.e.
 * Google was guessing. No page on the site was written for the term. This one
 * is: what cubing software is, who buys it, what it costs, and the free way to
 * do 90% of it. The comparison table is generated from competitors.json so it
 * stays in step with the /compare/* pages and the footer.
 */

interface Competitor {
  slug: string; name: string; url: string;
  summaryEn: string; summaryZh: string;
  pricingEn: string; pricingZh: string;
}
const COMPETITORS = (competitorsData as { competitors: Competitor[] }).competitors;

// platform + free-tier facts kept next to the vendors they describe; anything
// not verifiable from the vendor's public pages is marked as reported.
const META: Record<string, { platform: [string, string]; free: [string, string] }> = {
  'easycargo-alternative': { platform: ['Web', '網頁'], free: ['10-day trial', '10 日試用'] },
  'cargo-planner-alternative': { platform: ['Web + API', '網頁 + API'], free: ['Trial', '試用'] },
  'cube-iq-alternative': { platform: ['Windows / server', 'Windows / 伺服器'], free: ['Demo on request', '按需示範'] },
  'goodloading-alternative': { platform: ['Web', '網頁'], free: ['Limited free version', '有限免費版'] },
  '3dbinpacking-alternative': { platform: ['Web + API', '網頁 + API'], free: ['14-day trial', '14 日試用'] },
  'cargowiz-alternative': { platform: ['Windows', 'Windows'], free: ['30-day trial', '30 日試用'] },
  'cubemaster-alternative': { platform: ['Windows + web + API', 'Windows + 網頁 + API'], free: ['Trial', '試用'] },
  'searates-load-calculator-alternative': { platform: ['Web', '網頁'], free: ['1/day; 3/day registered', '每日 1 次;註冊後每日 3 次'] },
  'tops-pro-alternative': { platform: ['Windows', 'Windows'], free: ['Trial on request', '按需試用'] },
  'stackbuilder-alternative': { platform: ['Windows', 'Windows'], free: ['Free download', '免費下載'] },
  'packapp-alternative': { platform: ['Web + API', '網頁 + API'], free: ['On request', '按需'] },
};

export default function CubingSoftwarePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const faq: [string, string][] = lang === 'zh' ? [
    ['咩係 cubing software?', 'Cubing software 計算貨物實際佔用嘅立體空間(「cube」),並決定點樣將箱放入卡板、貨櫃或貨車先至最省位。輸入係箱嘅長闊高、重量同數量;輸出係擺位、層數、利用率同重量分佈。倉庫用嚟揀箱同砌板,運輸用嚟報價同裝櫃,包裝工程師用嚟設計外箱。'],
    ['Cubing software 同 CBM 計算機有咩分別?', 'CBM 計算機只係將長×闊×高加埋,假設空間可以無限切割。Cubing software 會真正試擺:考慮箱嘅方向、唔可以懸空、重箱唔可以壓輕箱、易碎唔可以疊。所以 CBM 話裝得 1,000 箱,cubing 可能話實際只裝得 870 箱 — 而 870 先係會發生嘅數。'],
    ['Cubing software 通常幾錢?', '第三方目錄同廠商價目頁顯示:網頁訂閱由每月約 US$39 至 US$99 每席起(3DBinPacking、CubeMaster Online、Cargo-Planner、EasyCargo),Windows 永久授權由約 US$750 至 US$2,500 每席(CargoWiz、CubeMaster 桌面版),企業級套件(Cube-IQ、TOPS Pro、Cape Pack)報價制,通常每年數千美元。DimPack3D 嘅規劃器免費,API 有免費 key。'],
    ['有免費嘅 cubing software 嗎?', '有。DimPack3D 嘅 3D 裝載規劃器免費喺瀏覽器運行,連重量、堆疊同易碎限制;StackBuilder 係免費 Windows 下載;SeaRates Load Calculator 每日有 1 次免費計算;Goodloading 有有限免費版。多數商業產品只提供 10–30 日試用。'],
  ] : [
    ['What is cubing software?', 'Cubing software calculates the real three-dimensional space ("cube") a set of cartons occupies and works out how to place them on pallets, in containers or in trucks with the least wasted space. Inputs are carton length, width, height, weight and quantity; outputs are exact placements, layer counts, utilization and weight distribution. Warehouses use it to pick cartons and build pallets, shippers to quote and load containers, and packaging engineers to size shipcases.'],
    ['How is cubing software different from a CBM calculator?', 'A CBM calculator only adds up length × width × height and assumes space can be sliced arbitrarily. Cubing software actually tries the placements: carton orientation, no overhang without support, heavy never on light, fragile never stacked on. So where CBM says 1,000 cartons fit, cubing may say 870 — and 870 is the number that will happen at the dock.'],
    ['How much does cubing software cost?', 'From vendor pricing pages and third-party listings: web subscriptions run roughly US$39–99 per seat per month (3DBinPacking, CubeMaster Online, Cargo-Planner, EasyCargo); Windows perpetual licences about US$750–2,500 per seat (CargoWiz, CubeMaster desktop); enterprise suites (Cube-IQ, TOPS Pro, Cape Pack) are quote-based and typically several thousand dollars per year. DimPack3D’s planner is free and the API has a free key tier.'],
    ['Is there free cubing software?', 'Yes. DimPack3D’s 3D load planner runs free in the browser with weight, stacking and fragile constraints; StackBuilder is a free Windows download; SeaRates Load Calculator allows one free calculation per day; Goodloading has a limited free version. Most commercial products offer only a 10–30 day trial.'],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Cubing Software: what it does, what it costs, and a free option (2026)', 'Cubing Software 裝載計算軟件:功能、價錢同免費選擇(2026)')} | DimPack3D</title>
        <meta name="description" content={T(
          'Cubing software works out how cartons really fit on pallets, in containers and trucks — not just CBM math. What it does, who needs it, 11 tools compared with pricing, and a free browser-based cubing tool with weight and stacking limits.',
          'Cubing software 計算紙箱喺卡板、貨櫃同貨車入面真正點樣擺 — 唔止 CBM 數學。功能、適合邊啲人、11 款工具連價錢對比,以及一個免費瀏覽器 cubing 工具,連重量同堆疊限制。',
        )} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        })}</script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-3">{T('Cubing software, explained — and a free one', 'Cubing software 係咩 — 連一個免費選擇')}</h1>
      <p className="text-slate-600 mb-6 max-w-3xl">
        {T(
          '"Cubing" is the warehouse word for working out how much three-dimensional space cargo really takes — and therefore how many cartons fit on a pallet, how many pallets fit in a container, and which box an order should ship in. Cubing software does that with actual placements, not volume division. Below: what it does, who buys it, what 11 products charge, and how to do most of it free.',
          '「Cubing」係倉庫用語,指計算貨物真正佔用幾多立體空間 — 由此得出一個卡板裝幾多箱、一個貨櫃裝幾多板、一張訂單應該用邊個箱寄。Cubing software 用實際擺位去計,唔係用容積除法。下面講:佢做啲乜、邊啲人買、11 款產品收幾多錢,同點樣免費做到大部分。',
        )}
      </p>

      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6 mb-10">
        <h2 className="font-black text-slate-900 mb-1.5">{T('Free cubing tool — runs in your browser', '免費 cubing 工具 — 瀏覽器即用')}</h2>
        <p className="text-sm text-slate-600 mb-4">{T(
          'Paste your carton list, pick a pallet or container, and get exact 3D placements with weight, stacking, fragile and door-clearance checks. PDF load plan and CSV export. No install, no seats.',
          '貼上箱單,揀卡板或貨櫃,即得精確 3D 擺位,連重量、堆疊、易碎同櫃門闊度檢查。PDF 裝載方案同 CSV 導出。唔使安裝、唔使數席位。',
        )}</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/planner?import=1" onClick={() => track('cubing_cta', 'planner')} className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm">{T('Cube a shipment now', '即刻計一批貨')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></Link>
          <Link to="/pallet-height-calculator" onClick={() => track('cubing_cta', 'pallet')} className="inline-flex items-center gap-2 text-blue-700 font-semibold text-sm hover:underline">{T('Pallet height from an order', '由訂單計卡板高度')}</Link>
          <Link to="/api-pricing" onClick={() => track('cubing_cta', 'api')} className="inline-flex items-center gap-2 text-blue-700 font-semibold text-sm hover:underline">{T('Cubing API for your WMS', '俾 WMS 用嘅 cubing API')}</Link>
        </div>
      </div>

      <h2 className="text-xl font-black text-slate-900 mb-3">{T('What cubing software actually does', 'Cubing software 實際做啲乜')}</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-10 text-sm">
        {[
          [T('Carton cubing / cartonization', '揀箱 (cartonization)'), T('Which shipping box an order fits in, with fill rate and dimensional weight. Wrong box = paying DIM weight on air.', '一張訂單應該用邊個箱,連填充率同體積重量。揀錯箱 = 為空氣付 DIM 運費。')],
          [T('Pallet cubing / palletization', '砌板 (palletization)'), T('Cases per layer, layers high, loaded height and weight against the retailer or FBA routing guide; mixed-SKU pallets from an order.', '每層幾箱、疊幾層、裝載高度同重量對照零售商或 FBA 收貨規定;由訂單砌混合 SKU 卡板。')],
          [T('Container / truck cubing', '貨櫃 / 貨車 cubing'), T('How many cartons or pallets fit, in what arrangement, with payload, axle, door and centre-of-gravity checks. The number you quote against.', '裝幾多箱或幾多板、點樣排,連載重、車軸、櫃門同重心檢查。你報價用嘅數。')],
        ].map(([h, p], i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4"><div className="font-bold text-slate-900 mb-1">{h}</div><p className="text-slate-600">{p}</p></div>
        ))}
      </div>

      <h2 className="text-xl font-black text-slate-900 mb-3">{T('Who needs it', '邊啲人需要')}</h2>
      <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700 mb-10">
        {[
          T('3PLs and fulfilment warehouses: pick the right carton per order and build compliant pallets without a packaging engineer on shift.', '3PL 同履約倉:每張訂單揀對箱、砌合規卡板,唔使當更有包裝工程師。'),
          T('Importers and freight forwarders: quote a container count you can actually load, and catch the pallet that will not clear the door.', '進口商同貨代:報一個真正裝得落嘅櫃數,同捉出過唔到櫃門嘅卡板。'),
          T('E-commerce and DTC brands: estimate pallet height at order time for LTL quotes, avoid DIM-weight surprises.', '電商同 DTC 品牌:落單時估卡板高度做 LTL 報價,避免體積重量意外。'),
          T('Packaging engineers: size shipcases so the pallet pattern and the truck fill both work.', '包裝工程師:設計外箱尺寸令砌板圖案同貨車填充同時成立。'),
        ].map((s, i) => <li key={i} className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />{s}</li>)}
      </ul>

      <h2 className="text-xl font-black text-slate-900 mb-1">{T('11 cubing and load-planning tools compared', '11 款 cubing 同裝載規劃工具對比')}</h2>
      <p className="text-sm text-slate-500 mb-3">{T('Pricing from vendor pages or attributed third-party listings as of September 2026; verify before buying. Each row links to a fuller, honest comparison.', '價錢來自廠商頁面或已註明嘅第三方目錄,截至 2026 年 9 月;購買前請核實。每行連結到更完整嘅誠實對比。')}</p>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-3">{T('Tool', '工具')}</th><th className="py-2 pr-3">{T('Platform', '平台')}</th><th className="py-2 pr-3">{T('Free tier', '免費')}</th><th className="py-2 pr-3">{T('Pricing', '價錢')}</th><th className="py-2"></th>
          </tr></thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-blue-50/40">
              <td className="py-2 pr-3 font-bold text-slate-900">DimPack3D</td>
              <td className="py-2 pr-3">{T('Web + API', '網頁 + API')}</td>
              <td className="py-2 pr-3">{T('Planner free; API free key', '規劃器免費;API 免費 key')}</td>
              <td className="py-2 pr-3">{T('Free · API Starter $49/mo', '免費 · API Starter $49/月')}</td>
              <td className="py-2"><Link to="/planner" className="text-blue-700 font-semibold">{T('Open', '打開')}</Link></td>
            </tr>
            {COMPETITORS.map((c) => {
              const m = META[c.slug];
              return (
                <tr key={c.slug} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-2 pr-3 text-slate-700">{m ? T(m.platform[0], m.platform[1]) : '—'}</td>
                  <td className="py-2 pr-3 text-slate-700">{m ? T(m.free[0], m.free[1]) : '—'}</td>
                  <td className="py-2 pr-3 text-slate-600 text-xs max-w-md">{T(c.pricingEn, c.pricingZh)}</td>
                  <td className="py-2 whitespace-nowrap"><Link to={`/compare/${c.slug}`} onClick={() => track('cubing_compare', c.slug)} className="text-blue-700 font-semibold">{T('Compare', '對比')}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-black text-slate-900 mb-3">{T('Questions', '常見問題')}</h2>
      {faq.map(([q, a]) => <Accordion key={q} title={q}><p className="text-sm text-slate-700">{a}</p></Accordion>)}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/pallet-calculator" className="text-blue-700 font-bold">{T('Pallet calculator', '卡板計算器')} →</Link>
        <Link to="/cbm-calculator" className="text-blue-700 font-bold">{T('CBM calculator', 'CBM 計算器')} →</Link>
        <Link to="/pallets-per-container" className="text-blue-700 font-bold">{T('Pallets per container', '每櫃卡板數')} →</Link>
        <Link to="/reality-checks" className="text-blue-700 font-bold">{T('The 11 reality checks', '11 項現實檢查')} →</Link>
      </div>
    </div>
  );
}
