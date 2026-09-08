import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { cartonSpace } from '../lib/cartonSpace';

export default function CartonSpacePage() {
  const { lang } = useApp();
  const t = (en: string, zh: string) => lang === 'zh' ? zh : en;
  const [values, setValues] = useState(['40','30','30','20','10','10','12']);
  const labels = [t('Carton internal length (cm)', '紙箱內長（cm）'), t('Carton internal width (cm)', '紙箱內闊（cm）'), t('Carton internal height (cm)', '紙箱內高（cm）'), t('Packed product length (cm)', '包裝後產品長度（cm）'), t('Packed product width (cm)', '包裝後產品闊度（cm）'), t('Packed product height (cm)', '包裝後產品高度（cm）'), t('Products per carton', '每箱產品件數')];
  let result: ReturnType<typeof cartonSpace> | null = null;
  try {
    if (values.some(v => v.trim() === '')) throw new Error();
    result = cartonSpace(values.slice(0,3).map(Number), values.slice(3,6).map(Number), Number(values[6]));
  } catch { /* incomplete input stays explicitly unknown */ }
  const fmt = (n: number) => n.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en', {maximumFractionDigits:2});
  return <div className="mx-auto max-w-4xl px-4 py-10">
    <Helmet><title>{t('Carton Space Utilization Calculator — Empty Space & Product Fit | DimPack3D', '紙箱空間利用率計算機 — 空隙體積及產品裝箱 | DimPack3D')}</title><meta name="description" content={t('Calculate carton space utilization, geometric empty volume and a six-orientation uniform product grid. Free calculator with a worked example and packing limitations.', '計算紙箱空間利用率、幾何空隙體積及六種方向嘅整齊裝箱件數。附公式、例子及裝箱限制，免費使用。')} /></Helmet>
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{t('Packaging planning tool', '包裝規劃工具')}</p>
    <h1 className="mt-2 text-3xl font-bold">{t('Carton space utilization calculator', '紙箱空間利用率計算機')}</h1>
    <p className="mt-4 text-slate-600">{t('How much of your carton is product, and how much is unoccupied volume? Check both volume and a uniform grid fit before comparing a smaller box.', '你個紙箱有幾多係產品，幾多係未佔用空間？比較細一號紙箱前，先核對體積同整齊排列是否裝得落。')}</p>
    <div className="mt-7 grid gap-6 md:grid-cols-2">
      <form className="rounded-xl border border-slate-200 bg-white p-5" onSubmit={e => e.preventDefault()}>
        {labels.map((label,i) => <label key={label} className="mb-4 block text-sm font-semibold">{label}<input type="number" required min={i===6 ? 1 : .01} max={i===6 ? 10000000 : 10000} step={i===6 ? 1 : .01} value={values[i]} onChange={e => setValues(previous => previous.map((v,j) => i===j ? e.target.value : v))} className="mt-1 block w-full rounded border border-slate-300 p-2.5" /></label>)}
        <p className="text-xs leading-relaxed text-slate-500">{t('Use internal carton dimensions and include protective packaging in each product’s dimensions. Assumes all six orientations are allowed; no weight, crush or stacking check.', '紙箱請用內尺寸；產品尺寸請包括保護包裝。假設六個方向都可擺放，未檢查重量、抗壓或疊放限制。')}</p>
      </form>
      <section className="self-start rounded-xl border border-blue-100 bg-blue-50 p-6" aria-live="polite" aria-atomic="true">
        <h2 className="text-xl font-bold">{t('Geometric estimate', '幾何估算')}</h2>
        {!result ? <p className="mt-4">{t('Enter all dimensions as positive numbers and quantity as a positive whole number. Blank values are unknown.', '請輸入全部正數尺寸及正整數件數。空白資料代表未知。')}</p> : <div className="mt-4 space-y-4">
          <p>{t('Best uniform grid:', '最佳同方向排列：')} <strong>{result.best.grid.join(' × ')} = {fmt(result.best.count)}</strong> {t('products', '件')}</p>
          {result.fits ? <><p className="text-3xl font-bold">{fmt(result.fillPct!)}% <span className="text-base font-normal">{t('space occupied', '空間已佔用')}</span></p><p>{t('Geometric unoccupied volume:', '幾何未佔用體積：')} <strong>{fmt(result.emptyLitres!)} L</strong></p><p>{t('Carton internal volume:', '紙箱內體積：')} {fmt(result.cartonVolume/1000)} L</p></> : <p className="font-semibold text-amber-900">{t('This quantity does not fit the best uniform grid. No utilization result is asserted. A mixed-orientation arrangement may differ; verify a packing plan.', '件數超出最佳同方向排列容量，唔會當成可行裝箱方案或顯示利用率。混合方向結果可能不同，請核對裝箱方案。')}</p>}
          <Link className="inline-block rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white" to="/packing">{t('Explore the 3D packing tool', '試用 3D 裝箱工具')} →</Link>
        </div>}
      </section>
    </div>
    <article className="mt-10 space-y-4 leading-relaxed text-slate-600">
      <h2 className="text-xl font-bold text-slate-900">{t('Example: 12 products in a 40 × 30 × 30 cm carton', '例子：40 × 30 × 30 cm 紙箱裝 12 件產品')}</h2>
      <p>{t('Each packed product is 20 × 10 × 10 cm, or 2 litres. Twelve occupy 24 litres of a 36-litre carton: 66.67% utilization and 12 litres of geometric empty space. A uniform 2 × 3 × 3 grid can hold 18, before weight or protection constraints. Empty volume is not a recommendation to remove necessary cushioning.', '每件包裝後產品 20 × 10 × 10 cm，即 2 公升。12 件佔 24 公升，紙箱內體積 36 公升，利用率 66.67%，幾何空隙為 12 公升。2 × 3 × 3 整齊排列可裝 18 件，但未計重量或保護要求。空隙體積唔代表應該移除必要緩衝物料。')}</p>
      <h2 className="text-xl font-bold text-slate-900">{t('Formula and limits', '公式及限制')}</h2>
      <p>{t('Utilization = product length × width × height × quantity ÷ internal carton volume × 100. Empty litres = (carton volume − product volume) ÷ 1,000 when dimensions are centimetres. Grid capacity tests six rotations and multiplies the whole-number fit along each axis. This is the best uniform orientation, not a proof of the globally optimal mixed packing.', '利用率 = 產品長 × 闊 × 高 × 件數 ÷ 紙箱內體積 × 100。尺寸用厘米時，空隙公升 =（紙箱體積 − 產品體積）÷ 1,000。排列容量測試六種旋轉方向，再將每個方向可放嘅整數件數相乘。呢個係最佳同方向排列，唔代表混合排列嘅全局最佳解。')}</p>
      <h2 className="text-xl font-bold text-slate-900">{t('Does less empty space mean lower freight charges?', '空隙少啲就一定平運費？')}</h2>
      <p>{t('Not necessarily. Freight calculations use external packed dimensions and may be governed by actual weight, dimensional weight, minimum charges or contract rules. This internal-space calculator does not calculate shipping savings. Measure the finished package, then compare chargeable weight and pallet fit with the linked tools.', '未必。運費按包裝後外尺寸計，亦可能受實重、材積重、最低收費或合約規則影響。呢個內部空間工具唔會推算節省運費。完成包裝後量度外尺寸，再用以下工具比較計費重量及卡板排列。')}</p>
      <p><Link className="text-blue-600 underline" to="/dimensional-weight-calculator">{t('Dimensional weight', '材積重量')}</Link> · <Link className="text-blue-600 underline" to="/cbm-calculator">{t('Total shipping CBM', '總運輸 CBM')}</Link> · <Link className="text-blue-600 underline" to="/pallet-calculator">{t('Pallet calculator', '卡板計算機')}</Link></p>
    </article>
  </div>;
}
