import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PackingPage from './pages/PackingPage';
import ContainerPage from './pages/ContainerPage';
import FbaPage from './pages/FbaPage';
import PlannerPage from './pages/PlannerPage';
import AnswersHub from './pages/AnswersHub';
import AnswerPage from './pages/AnswerPage';
import AboutPage from './pages/AboutPage';
import MyPlansPage from './pages/MyPlansPage';
import ReviewPage from './pages/ReviewPage';
import ComparePage from './pages/ComparePage';
import WarehousePage from './pages/WarehousePage';
import ApiDocsPage from './pages/ApiDocsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import GuidesPage from './pages/guides/GuidesPage';
import FbaSizeTiersGuide from './pages/guides/FbaSizeTiersGuide';
import CbmCalculatorGuide from './pages/guides/CbmCalculatorGuide';
import ContainerLoadingGuide from './pages/guides/ContainerLoadingGuide';
import DimensionalWeightGuide from './pages/guides/DimensionalWeightGuide';
import ProductsPerCartonGuide from './pages/guides/ProductsPerCartonGuide';
import AmazonDimensionalWeightGuide from './pages/guides/AmazonDimensionalWeightGuide';
import FbaFeeCalculatorGuide from './pages/guides/FbaFeeCalculatorGuide';
import PalletCalculatorGuide from './pages/guides/PalletCalculatorGuide';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="packing" element={<PackingPage />} />
        <Route path="container" element={<ContainerPage />} />
        <Route path="fba" element={<FbaPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="answers" element={<AnswersHub />} />
        <Route path="answers/:slug" element={<AnswerPage />} />
        <Route path="plans" element={<MyPlansPage />} />
        <Route path="review/:id" element={<ReviewPage />} />
        <Route path="compare/:slug" element={<ComparePage />} />
        <Route path="api-docs" element={<ApiDocsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="guides" element={<GuidesPage />} />
        <Route path="guides/fba-size-tiers-2025" element={<FbaSizeTiersGuide />} />
        <Route path="guides/cbm-calculator-shipping" element={<CbmCalculatorGuide />} />
        <Route path="guides/container-loading-optimization" element={<ContainerLoadingGuide />} />
        <Route path="guides/dimensional-weight-calculator" element={<DimensionalWeightGuide />} />
        <Route path="guides/products-per-carton" element={<ProductsPerCartonGuide />} />
        <Route path="guides/amazon-dimensional-weight" element={<AmazonDimensionalWeightGuide />} />
        <Route path="guides/fba-fee-calculator" element={<FbaFeeCalculatorGuide />} />
        <Route path="guides/pallet-calculator" element={<PalletCalculatorGuide />} />
      </Route>
    </Routes>
  );
}
