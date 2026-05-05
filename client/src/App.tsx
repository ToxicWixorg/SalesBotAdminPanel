import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useHasAccess } from "./hooks/useHasAccess";
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
// const PerksPage = lazy(() => import("./pages/Perks/PerksPage"));
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

function SectionRoute({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasAccess = useHasAccess(section);
  const { t } = useTranslation();
  if (isLoading) return <SuspencePage Text={t("common.loading")} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
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
                  <SectionRoute section="products">
                    <ProductsPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <SectionRoute section="orders">
                    <OrdersPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <SectionRoute section="users">
                    <UsersPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <SectionRoute section="tickets">
                    <TicketsPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <SectionRoute section="wallet">
                    <WalletPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/discounts"
                element={
                  <SectionRoute section="discounts">
                    <DiscountsPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/referrals"
                element={
                  <SectionRoute section="referrals">
                    <ReferralsPage />
                  </SectionRoute>
                }
              />
              {/* <Route
                path="/perks"
                element={
                  <SectionRoute section="perks">
                    <PerksPage />
                  </SectionRoute>
                }
              /> */}
              <Route
                path="/schedules"
                element={
                  <SectionRoute section="schedules">
                    <SchedulesPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/broadcast"
                element={
                  <SectionRoute section="broadcast">
                    <BroadcastPage />
                  </SectionRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <SectionRoute section="settings">
                    <SettingsPage />
                  </SectionRoute>
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
