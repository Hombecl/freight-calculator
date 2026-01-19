import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';

export default function PackingPage() {
  return (
    <>
      <Helmet>
        <title>Product Packing Calculator - 3D Box Packing Optimizer | DimPack3D</title>
        <meta name="description" content="Free 3D product packing calculator. Calculate how many products fit in a carton, optimize packing arrangement, estimate CBM and shipping costs for air & sea freight." />
        <meta name="keywords" content="packing calculator, box packing calculator, carton calculator, CBM calculator, shipping calculator, products per carton, 3D packing visualization, air freight calculator, sea freight calculator" />
        <link rel="canonical" href="https://www.dimpack3d.com/packing" />
        <meta property="og:url" content="https://www.dimpack3d.com/packing" />
        <meta property="og:title" content="Product Packing Calculator - 3D Box Packing Optimizer | DimPack3D" />
        <meta property="og:description" content="Calculate optimal product-to-carton packing with 3D visualization. Estimate CBM and shipping costs for air & sea freight." />
      </Helmet>
      <Calculator fixedMode="packing" hideHeader={true} />
    </>
  );
}
