import {useState} from 'react';

export default function PackingGain({baseline, loaded, zh}: {baseline: number; loaded: number; zh: boolean}) {
  const [quote, setQuote] = useState('');
  const cost = Number(quote);
  const hasQuote = quote.trim() !== '' && Number.isFinite(cost) && cost >= 0;
  const t = (en: string, cn: string) => zh ? cn : en;
  return <section className="rounded border border-green-200 bg-green-50 p-3 text-sm space-y-2" data-testid="packing-improvement" aria-label={t('Packing improvement', '裝箱改善')}>
    <p>{t('Compared with the initial layout:', '相比初始方案：')} <b>+{loaded - baseline} {t('cartons', '箱')}</b> ({baseline} → {loaded}).</p>
    <p className="text-xs">{t('The improved layout passed geometry, full-base support and entered load-limit checks. Review door access and handling before use.', '改善方案已通過幾何、完整箱底承托及已輸入載重限制檢查。使用前仍需核對櫃門通道及搬運安排。')}</p>
    <details><summary className="cursor-pointer">{t('What does this mean for my freight cost?', '對我嘅運費有咩影響？')}</summary>
      <label className="block mt-2">{t('Freight quote for this container (optional)', '此貨櫃運費報價（可略過）')}
        <input type="number" min="0" step="any" className="block w-full rounded border bg-white p-2" value={quote} onChange={e => setQuote(e.target.value)}/>
      </label>
      {hasQuote && baseline > 0 && <p className="mt-2" role="status">{t('Freight per loaded carton:', '每個已裝入紙箱分攤運費：')} {(cost / baseline).toFixed(2)} → <b>{(cost / loaded).toFixed(2)}</b> {t('in your quote’s currency', '（報價原幣）')}.</p>}
      <p className="mt-2 text-xs">{t('Assumes the same container quote for both layouts. This allocates your entered freight cost; it does not reduce the quoted invoice or include other fees.', '假設兩個方案使用相同貨櫃報價。此處只分攤你輸入嘅運費，唔代表報價總額減少，亦未計其他費用。')}</p>
    </details>
  </section>;
}
