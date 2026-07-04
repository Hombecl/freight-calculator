import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';

export default function PackingPage() {
  return (
    <>
      <Helmet>
        <title>Product Packing Calculator - 3D Box Packing Optimizer | DimPack3D</title>
        <meta name="description" content="Free 3D product packing calculator. Calculate how many products fit in a carton, optimize packing arrangement, estimate CBM and shipping costs for air & sea freight." />
        <meta name="keywords" content="packing calculator, box packing calculator, carton calculator, CBM calculator, shipping calculator, products per carton, 3D packing visualization, air freight calculator, sea freight calculator" />
        <meta property="og:url" content="https://www.dimpack3d.com/packing" />
        <meta property="og:title" content="Product Packing Calculator - 3D Box Packing Optimizer | DimPack3D" />
        <meta property="og:description" content="Calculate optimal product-to-carton packing with 3D visualization. Estimate CBM and shipping costs for air & sea freight." />
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
