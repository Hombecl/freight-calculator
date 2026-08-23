import { Helmet } from 'react-helmet-async';
import { IS_ZH } from '../lib/locale';
import Calculator from '../components/Calculator';

export default function PackingPage() {
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  return (
    <>
      <Helmet>
        <title>{T("Product Packing Calculator - 3D Box Packing Optimizer | DimPack3D", "產品裝箱計算器 — 3D 紙箱裝箱優化 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Free 3D product packing calculator. Calculate how many products fit in a carton, optimize packing arrangement, estimate CBM and shipping costs for air & sea freight.",
          "免費 3D 產品裝箱計算器。計一個紙箱可以裝幾多件產品、優化擺放方式,並估算 CBM 同空運海運運費。")} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How does the packing calculator work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Enter your product dimensions and carton dimensions. The calculator automatically determines the optimal arrangement to maximize the number of products per carton, then calculates total CBM and estimates shipping costs for both air and sea freight."
                }
              },
              {
                "@type": "Question",
                "name": "Can I see a 3D visualization of the packing?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Our calculator includes an interactive 3D simulation that shows exactly how products are arranged inside the carton. You can rotate, zoom, and explore the packing layout."
                }
              },
              {
                "@type": "Question",
                "name": "How is CBM calculated for shipping?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "CBM (Cubic Meter) is calculated as Length × Width × Height (in cm) ÷ 1,000,000. For multiple cartons, multiply the single carton CBM by quantity. Our calculator handles this automatically."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <Calculator fixedMode="packing" hideHeader={true} />
    </>
  );
}
