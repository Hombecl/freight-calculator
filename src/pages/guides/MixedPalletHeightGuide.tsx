import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../../context/AppContext';
export default function MixedPalletHeightGuide(){
 const {lang}=useApp(); const T=(en:string,zh:string)=>lang==='zh'?zh:en;
 const title=T('Mixed carton pallet height: a worked order example','混合紙箱棧板高度：由一板到完整訂單的實例');
 const description=T('Follow a 20-carton example, compare one and three pallets, and download the order to test height limits in the 3D calculator.','用 20 箱訂單比較一板與三板的高度和未裝箱數，下載範例，再用互動擺位工具試自己的限制。');
 return <article className="max-w-3xl mx-auto space-y-6 text-slate-700 leading-relaxed">
 <Helmet><title>{title} | DimPack3D</title><meta name="description" content={description}/><meta property="og:type" content="article"/><script type="application/ld+json">{JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:title,description,inLanguage:lang==='zh'?'zh-Hant':'en',author:{'@type':'Organization',name:'DimPack3D'}})}</script></Helmet>
 <Link to="/guides" className="text-blue-700 underline">{T('All guides','所有教學')}</Link>
 <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
 <p>{T('Total carton volume divided by pallet area does not tell you the actual loaded height. Box dimensions, allowed rotation, payload and height limits determine which arrangements fit. Start with the whole order, then check what remains unplaced.','用紙箱總體積除以棧板面積，並不能得出實際裝板高度。箱的長寬、可否側放、載重及高度限制，都會影響擺法。先列出整張訂單，再檢查還有多少箱未裝入。')}</p>
 <h2 className="text-xl font-bold">{T('The order and its limits','訂單與限制')}</h2>
 <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr>{[T('Carton','箱型'),T('L × W × H (cm)','長 × 寬 × 高 (cm)'),T('Weight (kg)','每箱重量 (kg)'),T('Quantity','數量')].map(h=><th className="border-b p-2" key={h}>{h}</th>)}</tr></thead><tbody><tr><td className="p-2">{T('Large','大箱')}</td><td>60 × 40 × 30</td><td>8</td><td>12</td></tr><tr><td className="p-2">{T('Small','小箱')}</td><td>40 × 30 × 20</td><td>4</td><td>8</td></tr></tbody></table></div>
 <p>{T('Use a 120 × 80 cm pallet with a 15 cm base, a 70 cm total height limit and a 750 kg cargo limit. Both carton types stay upright. No top-load strength data is supplied, so this example does not establish carton strength.','使用 120 × 80 cm 棧板、15 cm 底座、70 cm 連底座總高度上限、750 kg 貨物載重上限。兩款箱保持直立；未提供頂部承重數據，所以此例並未證明紙箱強度足夠。')}</p>
 <h2 className="text-xl font-bold">{T('One pallet: 65 cm is only part of the order','只用一板：65 cm 只代表部分訂單')}</h2>
 <p>{T('With a one-pallet limit, the order-v1 engine places 4 large and 8 small cartons. Cargo height is 50 cm; adding the 15 cm base gives 65 cm. Eight large cartons remain. Do not use that height as evidence that the entire shipment fits.','只准用一板時，order-v1 引擎放入 4 個大箱及 8 個小箱。貨物高 50 cm，加 15 cm 底座，共 65 cm。但仍有 8 個大箱未裝入；這個高度並不代表整張訂單已完成。')}</p>
 <h2 className="text-xl font-bold">{T('Allow three pallets: all 20 cartons fit','容許三板：全部 20 箱放入')}</h2>
 <div className="grid grid-cols-3 gap-3">{[[12,65],[4,45],[4,45]].map(([count,height],i)=><div className="rounded-xl bg-blue-50 p-3" key={i}><p>{T('Pallet','棧板')} {i+1}</p><p className="font-bold text-xl">{height} cm</p><p>{count} {T('cartons','箱')}</p></div>)}</div>
 <p>{T('The same order with a three-pallet limit has zero cartons remaining. These are feasible geometric placements found by the algorithm, not proof that three is the mathematical minimum. The cargo weighs 128 kg in total, excluding empty pallets, wrapping and straps.','同一訂單容許最多三板後，剩餘箱數為零。這是演算法找到的可用幾何方案，沒有證明三板就是數學上的最少板數。貨物共重 128 kg，不包括空棧板、包裝及綁帶。')}</p>
 <h2 className="text-xl font-bold">{T('Try it with your shipment','換成你的貨件試算')}</h2>
 <ol className="list-decimal pl-6 space-y-2"><li><a href="/examples/mixed-pallet-order.json" download className="text-blue-700 underline">{T('Download the example order JSON','下載示範訂單 JSON')}</a></li><li><Link to="/pallet-height-calculator" className="text-blue-700 underline">{T('Open the pallet height calculator','開啟棧板高度工具')}</Link>{T(' and import the file under “Saved orders”. Change the pallet limit between 1 and 3.','，在「已儲存訂單」匯入檔案。把最多板數在 1 和 3 之間切換。')}</li><li>{T('Inspect each pallet from above and from the side, then play the carton sequence. Check remaining quantities before printing.','逐板切換俯視、側視，再播放擺箱步驟。列印前檢查剩餘箱數。')}</li><li>{T('Replace the example dimensions and constraints with your own. After loading, record the measured height and compare it with the estimate.','換成自己的箱型及限制。實際裝板後記錄量度高度，與估算比較。')}</li></ol>
 <p>{T('Before sending a plan to the warehouse, confirm carton strength, permitted orientation and securing requirements with the people handling the load. A 3D placement diagram alone does not establish transport stability.','交予倉庫前，應與裝載人員確認紙箱強度、可擺方向及固定要求。單靠 3D 擺位圖並不能證明運輸穩定性。')}</p>
 </article>;
}
