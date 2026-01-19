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
      </Helmet>
      <Calculator fixedMode="loading" hideHeader={true} />
    </>
  );
}
