import { Helmet } from 'react-helmet-async';
import { IS_ZH } from '../lib/locale';
import Calculator from '../components/Calculator';

export default function ContainerPage() {
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  return (
    <>
      <Helmet>
        <title>{T("Container Loading Calculator - 20GP 40GP 40HQ Optimizer | DimPack3D", "貨櫃裝載計算器 — 20GP、40GP、40HQ 裝載優化 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Free container loading calculator. Calculate how many cartons fit in 20GP, 40GP, 40HQ shipping containers. Maximize space utilization with 3D visualization.",
          "免費貨櫃裝載計算器。計 20GP、40GP、40HQ 貨櫃可以裝幾多箱,用 3D 視覺化將空間利用率做到最盡。")} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What container types does this calculator support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our calculator supports three standard shipping container types: 20GP (20-foot General Purpose, ~33 CBM), 40GP (40-foot General Purpose, ~67 CBM), and 40HQ (40-foot High Cube, ~76 CBM)."
                }
              },
              {
                "@type": "Question",
                "name": "How do I maximize container space utilization?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Enter your carton dimensions and the calculator will automatically determine the optimal loading arrangement. Aim for 80-85% utilization rate, leaving some space for cargo handling and to prevent damage."
                }
              },
              {
                "@type": "Question",
                "name": "Can I sync carton data from the packing calculator?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Data is automatically synced between our packing calculator and container loading calculator. Calculate your product-to-carton packing first, then seamlessly check how many cartons fit in a container."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <Calculator fixedMode="loading" hideHeader={true} />
    </>
  );
}
