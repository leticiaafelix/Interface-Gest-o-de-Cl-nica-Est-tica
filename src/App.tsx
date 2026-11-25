import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgendaPage } from './pages/AgendaPage';
import { ProfessionalsNowPage } from './pages/ProfessionalsNowPage';
import { MySchedulePage } from './pages/MySchedulePage';
import { CounterBookingPage } from './pages/CounterBookingPage';
import { WaitlistPage } from './pages/WaitlistPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { ClientsPage } from './pages/ClientsPage';
import { ServicesPage } from './pages/ServicesPage';
import { PackagesPage } from './pages/PackagesPage';
import { ProfessionalsAdminPage } from './pages/ProfessionalsAdminPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserRole } from './types/clinic';

const ProtectedRoute: React.FC<{
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { currentUser } = useClinic();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <Navigate
        to={currentUser.role === 'profissional' ? '/minha-agenda' : '/dashboard'}
        replace
      />
    );
  }
  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { currentUser } = useClinic();
  if (!currentUser) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={currentUser.role === 'profissional' ? '/minha-agenda' : '/dashboard'}
      replace
    />
  );
};

export default function App() {
  return (
    <ClinicProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RootRedirect />} />

            {/* Atendente + Gerente */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="agenda"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <AgendaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profissionais-agora"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <ProfessionalsNowPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="balcao"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <CounterBookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="fila"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <WaitlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="disponibilidade"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <AvailabilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="clientes"
              element={
                <ProtectedRoute allowedRoles={['atendente', 'gerente']}>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />

            {/* Profissional */}
            <Route
              path="minha-agenda"
              element={
                <ProtectedRoute allowedRoles={['profissional']}>
                  <MySchedulePage />
                </ProtectedRoute>
              }
            />

            {/* Gerente only */}
            <Route
              path="servicos"
              element={
                <ProtectedRoute allowedRoles={['gerente']}>
                  <ServicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pacotes"
              element={
                <ProtectedRoute allowedRoles={['gerente']}>
                  <PackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profissionais"
              element={
                <ProtectedRoute allowedRoles={['gerente']}>
                  <ProfessionalsAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="relatorios"
              element={
                <ProtectedRoute allowedRoles={['gerente']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </HashRouter>
    </ClinicProvider>
  );
}
