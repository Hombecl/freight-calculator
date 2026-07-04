import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';

export default function FbaPage() {
  return (
    <>
      <Helmet>
        <title>Amazon FBA Size Tier Calculator 2025 - FBA Fee Estimator | DimPack3D</title>
        <meta name="description" content="Free Amazon FBA size tier calculator based on 2025 standards. Calculate FBA fulfillment fees, determine product size tiers, and optimize packaging to reduce costs." />
        <meta name="keywords" content="FBA calculator, Amazon FBA size tier, FBA fee calculator, Amazon fulfillment fees, FBA 2025, product size tier, FBA shipping calculator, Amazon seller tools, FBA optimization" />
        <meta property="og:url" content="https://www.dimpack3d.com/fba" />
        <meta property="og:title" content="Amazon FBA Size Tier Calculator 2025 - FBA Fee Estimator | DimPack3D" />
        <meta property="og:description" content="Calculate Amazon FBA size tiers and fulfillment fees based on 2025 standards. Optimize packaging to reduce FBA costs." />
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
