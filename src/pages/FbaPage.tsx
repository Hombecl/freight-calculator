import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';

export default function FbaPage() {
  return (
    <>
      <Helmet>
        <title>Amazon FBA Size Tier Calculator 2025 - FBA Fee Estimator | DimPack3D</title>
        <meta name="description" content="Free Amazon FBA size tier calculator based on 2025 standards. Calculate FBA fulfillment fees, determine product size tiers, and optimize packaging to reduce costs." />
        <meta name="keywords" content="FBA calculator, Amazon FBA size tier, FBA fee calculator, Amazon fulfillment fees, FBA 2025, product size tier, FBA shipping calculator, Amazon seller tools, FBA optimization" />
        <link rel="canonical" href="https://www.dimpack3d.com/fba" />
        <meta property="og:url" content="https://www.dimpack3d.com/fba" />
        <meta property="og:title" content="Amazon FBA Size Tier Calculator 2025 - FBA Fee Estimator | DimPack3D" />
        <meta property="og:description" content="Calculate Amazon FBA size tiers and fulfillment fees based on 2025 standards. Optimize packaging to reduce FBA costs." />
      </Helmet>
      <Calculator fixedMode="fba" hideHeader={true} />
    </>
  );
}
