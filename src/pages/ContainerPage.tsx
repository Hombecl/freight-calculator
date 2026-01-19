import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';

export default function ContainerPage() {
  return (
    <>
      <Helmet>
        <title>Container Loading Calculator - 20GP 40GP 40HQ Optimizer | DimPack3D</title>
        <meta name="description" content="Free container loading calculator. Calculate how many cartons fit in 20GP, 40GP, 40HQ shipping containers. Maximize space utilization with 3D visualization." />
        <meta name="keywords" content="container loading calculator, container calculator, 20GP calculator, 40GP calculator, 40HQ calculator, container utilization, shipping container optimizer, CBM calculator, container space" />
        <link rel="canonical" href="https://www.dimpack3d.com/container" />
        <meta property="og:url" content="https://www.dimpack3d.com/container" />
        <meta property="og:title" content="Container Loading Calculator - 20GP 40GP 40HQ Optimizer | DimPack3D" />
        <meta property="og:description" content="Calculate carton-to-container loading for 20GP, 40GP, 40HQ with maximum space utilization and 3D visualization." />
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
