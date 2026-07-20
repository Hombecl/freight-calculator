import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';

// Route-level code-splitting: each page is its own chunk, so the homepage
// doesn't pay for supabase/xlsx/guides it never uses.
const HomePage = lazy(() => import('./pages/HomePage'));
const PackingPage = lazy(() => import('./pages/PackingPage'));
const ContainerPage = lazy(() => import('./pages/ContainerPage'));
const FbaPage = lazy(() => import('./pages/FbaPage'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const AnswersHub = lazy(() => import('./pages/AnswersHub'));
const AnswerPage = lazy(() => import('./pages/AnswerPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const MyPlansPage = lazy(() => import('./pages/MyPlansPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const WarehousePage = lazy(() => import('./pages/WarehousePage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const RealityChecksPage = lazy(() => import('./pages/RealityChecksPage'));
const WarehouseSpaceCalcPage = lazy(() => import('./pages/WarehouseSpaceCalcPage'));
const AisleWidthCalcPage = lazy(() => import('./pages/AisleWidthCalcPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const GuidesPage = lazy(() => import('./pages/guides/GuidesPage'));
const FbaSizeTiersGuide = lazy(() => import('./pages/guides/FbaSizeTiersGuide'));
const CbmCalculatorGuide = lazy(() => import('./pages/guides/CbmCalculatorGuide'));
const ContainerLoadingGuide = lazy(() => import('./pages/guides/ContainerLoadingGuide'));
const DimensionalWeightGuide = lazy(() => import('./pages/guides/DimensionalWeightGuide'));
const ProductsPerCartonGuide = lazy(() => import('./pages/guides/ProductsPerCartonGuide'));
const AmazonDimensionalWeightGuide = lazy(() => import('./pages/guides/AmazonDimensionalWeightGuide'));
const FbaFeeCalculatorGuide = lazy(() => import('./pages/guides/FbaFeeCalculatorGuide'));
const PalletCalculatorGuide = lazy(() => import('./pages/guides/PalletCalculatorGuide'));
const EmbedPage = lazy(() => import('./pages/EmbedPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-400 text-sm">Loading…</div>}>
    <Routes>
      {/* Chrome-less widget embed — outside Layout on purpose (no header/footer/canonical) */}
      <Route path="embed" element={<EmbedPage />} />
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
        <Route path="reality-checks" element={<RealityChecksPage />} />
        <Route path="warehouse-space-calculator" element={<WarehouseSpaceCalcPage />} />
        <Route path="forklift-aisle-width-calculator" element={<AisleWidthCalcPage />} />
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
    </Suspense>
  );
}
