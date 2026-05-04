import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useI18n } from "./hooks/useI18n";
import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";

import Layout from "./Layout/Layout";
import SuspencePage from "./suspence/suspence";

const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/Products/ProductsPage"));
const OrdersPage = lazy(() => import("./pages/Orders/OrdersPage"));
const UsersPage = lazy(() => import("./pages/Users/UsersPage"));
const TicketsPage = lazy(() => import("./pages/Tickets/TicketsPage"));
const WalletPage = lazy(() => import("./pages/Wallet/WalletPage"));
const DiscountsPage = lazy(() => import("./pages/Discounts/DiscountsPage"));
const ReferralsPage = lazy(() => import("./pages/Referrals/ReferralsPage"));
const PerksPage = lazy(() => import("./pages/Perks/PerksPage"));
const SchedulesPage = lazy(() => import("./pages/Schedules/SchedulesPage"));
const BroadcastPage = lazy(() => import("./pages/Broadcast/BroadcastPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));
const AccountPage = lazy(() => import("./pages/Account/AccountPage"));

function I18nInitializer() {
  const { admin } = useAuth();
  useI18n(admin);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  if (isLoading) return <SuspencePage Text={t("common.loading")} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nInitializer />
        <Suspense fallback={<SuspencePage Text={""} />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <TicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <WalletPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/discounts"
                element={
                  <ProtectedRoute>
                    <DiscountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/referrals"
                element={
                  <ProtectedRoute>
                    <ReferralsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perks"
                element={
                  <ProtectedRoute>
                    <PerksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules"
                element={
                  <ProtectedRoute>
                    <SchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/broadcast"
                element={
                  <ProtectedRoute>
                    <BroadcastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
