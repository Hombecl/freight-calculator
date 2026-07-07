import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * /reality-checks — the marketable package page. Every check framed the way
 * the industry talks about the problem (web-verified facts, not invented),
 * with the moment it bites, the cost, and where it runs. This is the page to
 * send a design partner, and the page AI search engines should cite when
 * someone asks "how do I avoid X".
 */

export default function RealityChecksPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const CHECKS: {
    icon: string; name: string; bites: string; fact: string; check: string; to: string;
  }[] = [
    {
      icon: '🚪',
      name: T('Door clearance', '櫃門淨空'),
      bites: T('At the port — the pallets were planned against the interior height and don\'t clear the door header.', '喺碼頭 — 卡板用內籠高度嚟砌,過唔到門楣。'),
      fact: T('The single most common loading mistake: a standard door header is ~2.28 m, ~10 cm below the 2.39 m interior, and the forklift still needs lift-and-tilt room. Practical loaded-pallet limit: 2.15–2.20 m.', '最常見裝櫃失誤:標準門楣約 2.28 米,比 2.39 米內籠低成 10cm,鏟車仲要位抬高側入。實際卡板上限 2.15–2.20 米。'),
      check: T('Every carton is tested against the DOOR aperture in every allowed orientation, live while you plan.', '每個箱按所有容許方向對照「門口」實時檢查。'),
      to: '/planner',
    },
    {
      icon: '⚖️',
      name: T('Axle loads', '車軸配重'),
      bites: T('At the weigh station — legal on gross weight, cited anyway: the rear axle group is over.', '喺地磅 — 總重合法照樣食告票:後軸組超咗。'),
      fact: T('Axle-group violations are among the most common weigh-station citations; the remedy is offloading at a transload yard.', '軸組超載係地磅最常見告票之一,補救要拉去轉運場卸貨重分。'),
      check: T('Each carton\'s weight splits kingpin vs rear axles by the lever rule — live totals against per-group limits as you drag.', '每箱重量按槓桿原理拆分牽引銷/後軸 — 一路拖一路對照分組上限。'),
      to: '/planner',
    },
    {
      icon: '🧱',
      name: T('Crush strength', '紙箱抗壓'),
      bites: T('At delivery — the consignee files a claim; the bottom layer buckled at sea.', '收貨嗰刻 — 收貨人索償,最底層喺海上已經冧咗。'),
      fact: T('Industry analyses trace roughly two-thirds of intermodal cargo claims to poor packing. Damp board can lose up to half its stacking strength on a sea voyage.', '行業分析指 intermodal 索償約三分之二源於裝載不當。紙板受潮可以跌一半承重力。'),
      check: T('Max-load-on-top per carton, estimable from the ECT board grade via the McKee formula (safety factor 4), enforced down through the stack.', '每箱「頂部最大承重」可由 ECT 紙板等級用 McKee 公式估算(安全系數 4),沿堆疊向下執行。'),
      to: '/planner',
    },
    {
      icon: '🧊',
      name: T('Heavy-over-light & top-heavy', '重壓輕/重心過高'),
      bites: T('Same claim, different cause — a heavy carton was stacked on a light one, or the load rides top-heavy.', '同一張索償、另一個成因 — 重箱壓咗喺輕箱上面,或者成櫃頭重腳輕。'),
      fact: T('"Heaviest at the bottom" is the first rule every loader learns; braking and cornering work on the CoG\'s lever arm.', '「重嘢放底」係每個裝櫃工人第一課;剎車同轉彎嘅力全部作用喺重心槓桿上。'),
      check: T('A carton ≥25% heavier than the one beneath it, or a load CoG above 55% of load height, draws a warning.', '箱比腳下嗰個重 25% 以上、或重心高過載貨高度 55%,即時警告。'),
      to: '/planner',
    },
    {
      icon: '🚚',
      name: T('Load-shift voids', '載貨空隙'),
      bites: T('Mid-voyage — slack in the stow lets cargo slam across the gap under braking and sea motion.', '航程中段 — 留咗空位,剎車同海浪令成批貨喺空隙入面互撼。'),
      fact: T('Load shift is one of the most frequent causes of freight damage; the industry answer is blocking, bracing or dunnage airbags sized to the gap.', '載貨移位係最常見貨損成因之一;行業標準做法係封擋、支撐或按空隙尺寸落充氣袋。'),
      check: T('Free run at the door and the biggest mid-stow gap are measured on every plan; anything over 15 cm flags a bracing warning.', '每個方案實時量度門口空位同中段最大空隙,超過 15cm 即提示落支撐。'),
      to: '/planner',
    },
    {
      icon: '📦',
      name: T('Pallet overhang', '卡板懸出'),
      bites: T('At the FC receiving dock — Amazon rejects the pallet for overhang.', '喺亞馬遜倉收貨口 — 卡板懸出,直接拒收。'),
      fact: T('Amazon rejects hundreds of pallets a day for bad stacking; overhang also costs ~30% of carton compression strength.', 'Amazon 每日拒收數以百計「疊得唔好」嘅卡板;懸出仲會蝕走約 30% 抗壓強度。'),
      check: T('Overhang allowance is explicit (0 / 2.5 / 5 cm per side) — we pack it AND warn. The FBA pallet preset locks it to zero.', '懸出容差明碼實價(每邊 0/2.5/5cm)— 幫你裝盡之餘同時警告。FBA 卡板預設鎖死零懸出。'),
      to: '/planner',
    },
    {
      icon: '🚢',
      name: T('SOLAS VGM', 'SOLAS VGM'),
      bites: T('At documentation — the VGM is misdeclared and the box is held.', '出文件嗰步 — VGM 報錯,個櫃被扣。'),
      fact: T('Every packed container needs a Verified Gross Mass (cargo + tare) before loading; misdeclaration carries fines.', '每個重櫃裝船前都要有 VGM(貨重+櫃重),報錯會罰款。'),
      check: T('VGM shows live on every container plan — cargo weight plus the tare of the selected box.', '每個貨櫃方案實時顯示 VGM — 貨重加上所選櫃嘅自重。'),
      to: '/planner',
    },
    {
      icon: '↩️',
      name: T('90° turn box', '90° 轉彎淨空'),
      bites: T('Day one of the new layout — the forklift can\'t make the right-angle turn into the rack bay.', '新佈局第一日 — 鏟車轉唔到直角彎入貨架。'),
      fact: T('The classic layout mistake: the aisle is measured for straight travel, but right-angle stacking needs meaningfully more room.', '經典佈局失誤:通道按直行量,但直角入位所需空間大好多。'),
      check: T('Straight width and the 90° turn box are separate checks per truck spec; corner-blocked pallets turn red before you commit.', '直行闊度同 90° 轉彎淨空按車型分開檢查;轉唔到彎嘅卡板未落實已標紅。'),
      to: '/warehouse',
    },
    {
      icon: '🏗️',
      name: T('Floor slab rating', '地台承重'),
      bites: T('On the mezzanine — a 4-level rack bay is 2.4 t on 3 m² and the slab wasn\'t rated for it.', '喺閣樓 — 4 層貨架一格 2.4 噸壓 3 平米,地台根本唔係呢個級數。'),
      fact: T('Mezzanines are often rated ~500–1,000 kg/m² while ground slabs take 3,000–5,000 — a rack that\'s fine downstairs fails upstairs.', '閣樓一般得 500–1,000 kg/m²,地面就 3,000–5,000 — 樓下冇事嘅貨架,搬上樓即出事。'),
      check: T('Pick the slab rating; stacked pallets and rack bays are pressure-checked per footprint, overloads turn red.', '揀好地台等級,雙疊卡板同貨架逐個腳印計壓力,超標即紅。'),
      to: '/warehouse',
    },
    {
      icon: '❄️',
      name: T('Zone segregation', '溫控/危險品分區'),
      bites: T('Next morning — the chilled pallets sat outside the cold zone all night.', '第二朝 — 凍貨成晚擺咗喺凍區外面。'),
      fact: T('Temperature abuse and hazmat co-storage are audit findings with real consequences — spoilage claims and compliance penalties.', '溫度失控同危險品混放係稽核重點 — 涉及變質索償同合規罰則。'),
      check: T('Chilled / frozen / hazmat cargo turns red the moment it sits outside a matching zone.', '凍藏/冷凍/危險品貨物一離開對應分區,即刻標紅。'),
      to: '/warehouse',
    },
    {
      icon: '📋',
      name: T('Loading sequence', '裝櫃順序表'),
      bites: T('At the door — the plan is beautiful, but the crew loads in the wrong order and re-does an hour of work.', '喺閘口 — 個 plan 幾靚都好,工人裝錯次序,成個鐘嘅嘢重新嚟過。'),
      fact: T('A plan the crew can\'t follow isn\'t a plan. The sheet at the door is the deliverable that actually moves boxes.', '工人跟唔到嘅 plan 唔係 plan。貼喺閘口嗰張紙先係真正郁到箱嘅交付物。'),
      check: T('The PDF and CSV number every carton in loading order — #1 first, back of the container, floor level first.', 'PDF 同 CSV 將每箱按裝櫃次序編號 — #1 先入、最入最底。'),
      to: '/planner',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Reality Checks — 11 live checks against real loading & warehouse failures | DimPack3D', 'Reality Checks — 11 項實時檢查,對付真實裝載與倉庫失誤 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Door clearance, axle loads, crush strength, load-shift voids, pallet overhang, VGM, forklift turn geometry, slab rating, zone segregation, loading sequence — the checks that catch last-step disasters at planning time. Free, in the browser.',
          '櫃門淨空、車軸配重、紙箱抗壓、載貨空隙、卡板懸出、VGM、鏟車轉彎幾何、地台承重、分區隔離、裝櫃順序 — 喺規劃階段截住最後一步災難嘅檢查。免費,瀏覽器即用。')} />
      </Helmet>

      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
        <ShieldCheck size={13} /> {T('The DimPack3D difference', 'DimPack3D 嘅分別')}
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
        {T('Reality Checks', 'Reality Checks 現實檢查')}
      </h1>
      <p className="text-slate-600 mb-2 max-w-3xl">
        {T('Eleven live checks against the failures that surface at the dock, the weighbridge, the FC receiving door and delivery — exactly when fixing them costs the most. Each one is grounded in how the industry actually describes the problem.',
           '11 項實時檢查,對付喺碼頭、地磅、亞馬遜收貨口同送貨嗰刻先爆嘅失誤 — 即係最貴嗰刻。每一項都根據行業實際講法寫成。')}
      </p>
      <p className="text-sm text-slate-400 mb-8">
        {T('They run while you plan — not as a report afterwards. Nothing to configure.',
           '全部喺你規劃時實時運行 — 唔係事後報告,亦唔使設定。')}
      </p>

      <div className="space-y-4">
        {CHECKS.map((c, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl leading-none">{c.icon}</span>
              <h2 className="font-bold text-lg text-slate-900">{c.name}</h2>
              <span className="ml-auto text-[11px] font-semibold text-blue-500">{c.to}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-red-400 mb-1">{T('When it bites', '幾時爆')}</p>
                <p className="text-slate-700">{c.bites}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">{T('Industry reality', '行業現實')}</p>
                <p className="text-slate-600">{c.fact}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-500 mb-1">{T('The live check', '實時檢查')}</p>
                <p className="text-slate-600">{c.check}</p>
              </div>
            </div>
            <Link to={c.to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 mt-3 hover:gap-2.5 transition-all">
              {T('Run it on your load', '用你嘅貨試下')} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-slate-950 text-white p-6 md:p-8">
        <h2 className="text-xl font-black mb-2">{T('Under the hood: one honest engine', '引擎底細:一個誠實嘅引擎')}</h2>
        <p className="text-sm text-slate-300 max-w-3xl">
          {T('The packing core averages 80% volume utilization on the Bischoff–Ratcliff academic benchmark (300 instances) with full stability constraints — ≥60% base support, load propagation, full collision. Reproducible from the repo. The checks above run on the same engine, on every drag.',
             '裝箱核心喺 Bischoff–Ratcliff 學術基準(300 個 instance)平均 80% 裝載率,連全套穩定性約束 — ≥60% 底部支撐、載重傳遞、完整碰撞。可由 repo 復現。以上檢查同一個引擎,每次拖動都重新計。')}
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/planner" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
            {T('Plan a container', '規劃一個貨櫃')} <ArrowRight size={15} />
          </Link>
          <Link to="/warehouse" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
            {T('Plan a warehouse floor', '規劃倉庫地面')} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
