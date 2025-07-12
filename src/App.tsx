import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PaymentsPage from './pages/PaymentsPage';
import PaymentTypesPage from './pages/PaymentTypesPage';
import ResidentsPage from './pages/ResidentsPage';
import CondominiumsPage from './pages/CondominiumsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ConceptosPage from './pages/ConceptosPage';
import GastoTiposPage from './pages/GastoTiposPage';
import GastosPage from './pages/GastosPage';
import AdeudosPage from './pages/AdeudosPage';
import { default as AdeudoDetalleResidente } from './pages/AdeudosPage';
import AdeudosDetalleResidente from './pages/AdeudosDetalleResidente';
import EstadoCuentaPreview from './pages/EstadoCuentaPreview';

function App() {
  const location = useLocation();
  const isPreview = location.pathname.startsWith('/estado-cuenta/');
  return (
    <div className={isPreview ? '' : 'min-h-screen bg-gray-100'}>
      {!isPreview && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/adeudos" element={<AdeudosPage />} />
          <Route path="/adeudos/residente/:id" element={<AdeudoDetalleResidente />} />
          <Route path="/adeudos/detalle/:id" element={<AdeudosDetalleResidente />} />
          <Route path="/estado-cuenta/:id" element={<EstadoCuentaPreview />} />
          <Route path="/payment-types" element={<PaymentTypesPage />} />
          <Route path="/residents" element={<ResidentsPage />} />
          <Route path="/residents/editar/:id" element={<ResidentsPage />} />
          <Route path="/condominiums" element={<CondominiumsPage />} />
          <Route path="/conceptos" element={<ConceptosPage />} />
          <Route path="/conceptos/editar/:id" element={<ConceptosPage />} />
          <Route path="/gasto-tipos" element={<GastoTiposPage />} />
          <Route path="/gasto-tipos/editar/:id" element={<GastoTiposPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;