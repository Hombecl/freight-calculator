import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PackingPage from './pages/PackingPage';
import ContainerPage from './pages/ContainerPage';
import FbaPage from './pages/FbaPage';
import GuidesPage from './pages/guides/GuidesPage';
import FbaSizeTiersGuide from './pages/guides/FbaSizeTiersGuide';
import CbmCalculatorGuide from './pages/guides/CbmCalculatorGuide';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="packing" element={<PackingPage />} />
        <Route path="container" element={<ContainerPage />} />
        <Route path="fba" element={<FbaPage />} />
        <Route path="guides" element={<GuidesPage />} />
        <Route path="guides/fba-size-tiers-2025" element={<FbaSizeTiersGuide />} />
        <Route path="guides/cbm-calculator-shipping" element={<CbmCalculatorGuide />} />
      </Route>
    </Routes>
  );
}
