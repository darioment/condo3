import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
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
import UserManagementPage from './pages/UserManagementPage';
import InitializeAdminPage from './pages/InitializeAdminPage';

function App() {
  const location = useLocation();
  const isPreview = location.pathname.startsWith('/estado-cuenta/');
  const isLogin = location.pathname === '/login';
  const isInitializeAdmin = location.pathname === '/initialize-admin';
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className={isPreview || isLogin || isInitializeAdmin ? '' : 'min-h-screen bg-gray-100'}>
          {!isPreview && !isLogin && !isInitializeAdmin && (
            <ProtectedRoute>
              <Navbar />
            </ProtectedRoute>
          )}
          <main>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/initialize-admin" element={<InitializeAdminPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/payments" element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="/adeudos" element={
              <ProtectedRoute>
                <AdeudosPage />
              </ProtectedRoute>
            } />
            <Route path="/adeudos/residente/:id" element={
              <ProtectedRoute>
                <AdeudoDetalleResidente />
              </ProtectedRoute>
            } />
            <Route path="/adeudos/detalle/:id" element={
              <ProtectedRoute>
                <AdeudosDetalleResidente />
              </ProtectedRoute>
            } />
            <Route path="/estado-cuenta/:id" element={<EstadoCuentaPreview />} />
            <Route path="/payment-types" element={
              <ProtectedRoute>
                <PaymentTypesPage />
              </ProtectedRoute>
            } />
            <Route path="/residents" element={
              <ProtectedRoute>
                <ResidentsPage />
              </ProtectedRoute>
            } />
            <Route path="/residents/editar/:id" element={
              <ProtectedRoute>
                <ResidentsPage />
              </ProtectedRoute>
            } />
            <Route path="/condominiums" element={
              <ProtectedRoute>
                <CondominiumsPage />
              </ProtectedRoute>
            } />
            <Route path="/conceptos" element={
              <ProtectedRoute>
                <ConceptosPage />
              </ProtectedRoute>
            } />
            <Route path="/conceptos/editar/:id" element={
              <ProtectedRoute>
                <ConceptosPage />
              </ProtectedRoute>
            } />
            <Route path="/gasto-tipos" element={
              <ProtectedRoute>
                <GastoTiposPage />
              </ProtectedRoute>
            } />
            <Route path="/gasto-tipos/editar/:id" element={
              <ProtectedRoute>
                <GastoTiposPage />
              </ProtectedRoute>
            } />
            <Route path="/gastos" element={
              <ProtectedRoute>
                <GastosPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            } />
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;