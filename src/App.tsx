import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PackingPage from './pages/PackingPage';
import ContainerPage from './pages/ContainerPage';
import FbaPage from './pages/FbaPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="packing" element={<PackingPage />} />
        <Route path="container" element={<ContainerPage />} />
        <Route path="fba" element={<FbaPage />} />
      </Route>
    </Routes>
  );
}
