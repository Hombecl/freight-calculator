import { Helmet } from 'react-helmet-async';
import { IS_ZH } from '../lib/locale';
import Calculator from '../components/Calculator';

export default function FbaPage() {
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  return (
    <>
      <Helmet>
        <title>{T("Amazon FBA Size Tier Calculator 2025 - FBA Fee Estimator | DimPack3D", "Amazon FBA 尺寸分級計算器 2025 — FBA 費用估算 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Free Amazon FBA size tier calculator based on 2025 standards. Calculate FBA fulfillment fees, determine product size tiers, and optimize packaging to reduce costs.",
          "免費 Amazon FBA 尺寸分級計算器,依 2025 標準。計 FBA 配送費、判斷產品尺寸級別,並優化包裝慳返成本。")} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How do I use the FBA Size Tier Calculator?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Enter your product dimensions (length, width, height) and weight. The calculator will automatically determine which FBA size tier your product falls into and estimate the fulfillment fees based on Amazon's 2025 standards."
                }
              },
              {
                "@type": "Question",
                "name": "Is this FBA calculator free to use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, our FBA Size Tier Calculator is 100% free with no sign-up required. You can calculate unlimited products and save your calculations locally in your browser."
                }
              },
              {
                "@type": "Question",
                "name": "Does this calculator use the latest Amazon FBA fee structure?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, our calculator is updated to reflect Amazon's 2025 FBA fee structure, including the latest changes to dimensional weight calculations and size tier thresholds."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <Calculator fixedMode="fba" hideHeader={true} />
    </>
  );
}
