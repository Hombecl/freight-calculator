import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';

/**
 * Privacy policy — must stay ACCURATE to what the site actually does:
 * client-side computation; emails collected at the export gate / waitlists
 * (stored in Cloudflare KV); first-party cookie-less analytics (Cloudflare
 * Analytics Engine via /api/hit:
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
          'Your shipment data stays on your device when you use the planner and calculators: those computations run in your browser, and carton lists and load plans are not uploaded unless you explicitly create a share link or save a plan to your account. If you call the REST API (/api/*), the request is processed on Cloudflare edge servers and is not stored; we keep only per-key rate-limit counters. We collect an email only when you choose to give it, and we use light analytics to see which features are used.',
          '用規劃器同計算器時,你嘅貨運數據留喺你部機:計算喺瀏覽器進行,除非你主動建立分享連結或儲存方案,箱單同裝載方案唔會上傳。如果你調用 REST API(/api/*),請求會喺 Cloudflare edge 伺服器處理,唔會儲存;我哋只保留每條 key 嘅限流計數。只有你主動提供先會收集 email,我哋用輕量分析了解邊啲功能有人用。',
        ),
      ],
    },
    {
      h: T('What we collect', '我哋收集啲乜'),
      body: [
        T(
          'Email addresses — when you submit one to unlock exports, join a waitlist, request an API key or sign in. Export, waitlist and API requests are stored with their source and date on Cloudflare; optional company and use-case details are stored for API requests, and an optional task category is stored with export requests. Our email provider Resend processes internal notifications to the site operator. Product updates require a separate opt-in; unlocking an export alone does not subscribe you. Addresses are never sold or shared for third-party marketing.',
          'Email — 喺你提交地址解鎖導出、加入等候名單、申請 API key 或登入時收集。導出、等候名單及 API 申請會連同來源同日期儲存喺 Cloudflare；API 申請亦會儲存你自願填寫嘅公司同用途，導出申請會儲存你自選嘅工作類別。電郵服務 Resend 會處理發畀網站營運者嘅內部通知。產品更新需要另外選擇同意，解鎖導出本身唔代表訂閱。地址永不出售或交畀第三方作營銷用途。',
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
          'We do not collect the contents of your local planning sessions. Calculator inputs and 3D plans stay in your browser unless you choose to share or save a plan. Optional sign-in and saved plans use Supabase. API calculation requests are processed server-side without being stored. Local preferences (units, language) are stored in your own browser\'s localStorage.',
          '我哋唔收集你本地規劃過程嘅內容。計算輸入同 3D 方案留喺瀏覽器，除非你主動分享或儲存方案。自選登入及儲存方案功能使用 Supabase。API 計算請求喺伺服器處理而唔會儲存。本地偏好（單位、語言）存喺你自己瀏覽器嘅 localStorage。',
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
