import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';

export default function TermsPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const sections: { h: string; body: string }[] = [
    {
      h: T('Use of the service', '服務使用'),
      body: T(
        'DimPack3D provides free, browser-based packing and load-planning tools. You may use them for personal and commercial work. You may not resell the service itself, scrape it at abusive volume, or attempt to disrupt it.',
        'DimPack3D 提供免費、瀏覽器運行嘅裝箱與裝載規劃工具,可用於個人及商業工作。不得轉售服務本身、濫用式抓取或試圖干擾服務。',
      ),
    },
    {
      h: T('Results are estimates', '結果屬估算'),
      body: T(
        'Packing counts, utilization figures, load plans and fee estimates are computational estimates based on the dimensions and limits you enter. Real-world results depend on carton tolerance, packing skill, cargo behaviour, carrier rules and regulations. Verify critical plans before committing money to them. DimPack3D is not liable for losses arising from reliance on the tools\' output.',
        '裝箱數量、利用率、裝載方案同費用估算均為基於你輸入嘅尺寸與限制嘅計算估算。實際結果受紙箱公差、裝櫃手工、貨物特性、承運人規則及法規影響。重要方案請先核實再投入資金。DimPack3D 對依賴工具輸出而產生嘅損失概不負責。',
      ),
    },
    {
      h: T('Amazon FBA data', 'Amazon FBA 數據'),
      body: T(
        'FBA size tiers and fees reflect published Amazon US standards at the time of our last update and can change without notice. Always confirm against Amazon\'s official documentation before making listing decisions.',
        'FBA 尺寸分級與費用反映我哋最後更新時 Amazon 美國站公佈嘅標準,可能隨時變更。做 listing 決策前請以 Amazon 官方文件為準。',
      ),
    },
    {
      h: T('Share links & exports', '分享連結與導出'),
      body: T(
        'Share links store the shared plan on our servers so recipients can open it; links may expire after an extended period. Exports (PDF/CSV) are generated in your browser. You are responsible for the contents of plans you share.',
        '分享連結會將方案儲存喺我哋伺服器供接收者打開;連結可能喺較長時間後失效。導出(PDF/CSV)喺你瀏覽器生成。你對所分享方案嘅內容負責。',
      ),
    },
    {
      h: T('Changes & contact', '變更與聯絡'),
      body: T(
        'We may update these terms and the service itself at any time; material changes will be reflected on this page. Questions: hello@dimpack3d.com.',
        '我哋可隨時更新條款及服務;重大變更會反映喺本頁。查詢:hello@dimpack3d.com。',
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Terms of Use', '使用條款')} | DimPack3D</title>
        <meta name="description" content={T(
          'DimPack3D terms of use: free tools for personal and commercial use; results are computational estimates — verify critical plans.',
          'DimPack3D 使用條款:工具免費供個人及商業使用;結果屬計算估算 — 重要方案請核實。',
        )} />
      </Helmet>
      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Terms of Use', '使用條款')}</h1>
      <p className="text-sm text-slate-500 mb-8">{T('Last updated: 4 July 2026', '最後更新:2026 年 7 月 4 日')}</p>
      {sections.map((s, i) => (
        <section key={i} className="mb-8">
          <h2 className="font-bold text-lg text-slate-900 mb-3">{s.h}</h2>
          <p className="text-[15px] text-slate-700 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </div>
  );
}
