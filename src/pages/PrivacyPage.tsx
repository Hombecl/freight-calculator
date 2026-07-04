import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';

/**
 * Privacy policy — must stay ACCURATE to what the site actually does:
 * client-side computation; emails collected at the export gate / waitlists
 * (stored in Cloudflare KV); first-party cookie-less analytics (/api/hit:
 * event, path, referrer hostname, coarse country); Google Analytics 4
 * (cookies); optional share links stored server-side; hosting on Cloudflare.
 * Update this page whenever data handling changes.
 */
export default function PrivacyPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const sections: { h: string; body: string[] }[] = [
    {
      h: T('The short version', '重點'),
      body: [
        T(
          'Your shipment data stays on your device. All packing and calculator computations run in your browser; carton lists and load plans are not uploaded unless you explicitly create a share link. We collect an email only when you choose to give it, and we use light analytics to see which features are used.',
          '你嘅貨運數據留喺你部機。所有裝箱同計算都喺瀏覽器進行;除非你主動建立分享連結,箱單同裝載方案唔會上傳。只有你主動提供先會收集 email,我哋用輕量分析了解邊啲功能有人用。',
        ),
      ],
    },
    {
      h: T('What we collect', '我哋收集啲乜'),
      body: [
        T(
          'Email addresses — only when you submit one to unlock exports or join a waitlist. Stored with the submission source and date on Cloudflare infrastructure. Used to send you the thing you asked for and occasional product updates. Never sold or shared with third parties for marketing.',
          'Email — 只喺你為解鎖導出或加入等候名單而提交時收集,連同來源同日期儲存喺 Cloudflare 基礎設施。只用嚟提供你要求嘅嘢同偶爾嘅產品更新,永不出售或與第三方共享作營銷用途。',
        ),
        T(
          'Usage analytics — our own cookie-less counter records the event type (e.g. page view, export), the page path, the referring site\'s hostname, and a country code derived from the request. No cookies, no fingerprinting, no persistent identifiers on our side.',
          '使用分析 — 我哋自建嘅免 cookie 計數器記錄事件類型(如瀏覽、導出)、頁面路徑、來源網站域名、由請求推斷嘅國家代碼。冇 cookie、冇指紋、冇持久識別碼。',
        ),
        T(
          'Google Analytics 4 — we also load GA4, which uses cookies to measure visits. You can block it with any standard ad/tracker blocker; the site works identically without it.',
          'Google Analytics 4 — 我哋亦載入 GA4,佢使用 cookie 統計訪問。你可用任何標準攔截器封鎖佢,網站功能完全不受影響。',
        ),
        T(
          'Share links — if you click "Share", the current plan (container, cartons, positions) is stored on our servers under a random ID so the link can be opened by others. Do not share plans containing information you consider confidential.',
          '分享連結 — 你撳「分享」時,當前方案(貨櫃、紙箱、位置)會以隨機 ID 儲存喺我哋伺服器,令連結可被打開。如方案含機密資料請勿分享。',
        ),
      ],
    },
    {
      h: T('What we do NOT collect', '我哋唔收集啲乜'),
      body: [
        T(
          'We do not collect names, accounts, payment details, or the contents of your planning sessions. Calculator inputs and 3D plans never leave your browser in normal use. Local preferences (units, language) are stored in your own browser\'s localStorage.',
          '我哋唔收集姓名、帳戶、付款資料或你規劃過程嘅內容。正常使用下,計算輸入同 3D 方案永不離開你嘅瀏覽器。本地偏好(單位、語言)存喺你自己瀏覽器嘅 localStorage。',
        ),
      ],
    },
    {
      h: T('Your rights & contact', '你嘅權利與聯絡'),
      body: [
        T(
          'You can ask us to delete any email you submitted, or request a copy of what we hold about it, by writing to hello@dimpack3d.com. We will action requests within 30 days. This site is operated for a global audience; where GDPR or similar laws apply, the lawful basis for processing emails is consent, which you may withdraw at any time.',
          '你可以電郵 hello@dimpack3d.com 要求刪除你提交過嘅 email,或索取我哋所持有嘅相關資料副本,我哋會喺 30 日內處理。本站面向全球用戶;如 GDPR 或類似法律適用,處理 email 嘅法律基礎為「同意」,你可隨時撤回。',
        ),
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Privacy Policy', '私隱政策')} | DimPack3D</title>
        <meta name="description" content={T(
          'DimPack3D privacy policy: computation stays on your device; emails only when you choose to give one; cookie-less first-party analytics plus GA4.',
          'DimPack3D 私隱政策:計算留喺你部機;只喺你主動提供時收集 email;免 cookie 自家分析加 GA4。',
        )} />
      </Helmet>
      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Privacy Policy', '私隱政策')}</h1>
      <p className="text-sm text-slate-500 mb-8">{T('Last updated: 4 July 2026', '最後更新:2026 年 7 月 4 日')}</p>
      {sections.map((s, i) => (
        <section key={i} className="mb-8">
          <h2 className="font-bold text-lg text-slate-900 mb-3">{s.h}</h2>
          {s.body.map((p, j) => (
            <p key={j} className="text-[15px] text-slate-700 leading-relaxed mb-3">{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
