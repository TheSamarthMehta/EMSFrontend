import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useNavigation,
} from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedLayout } from "@/routes/ProtectedLayout";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const CompleteProfilePage = lazy(() => import("@/pages/CompleteProfilePage"));
const VerifyEmailCodePage = lazy(() => import("@/pages/VerifyEmailCodePage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const GroupsPage = lazy(() => import("@/pages/GroupsPage"));
const GroupDetailPage = lazy(() => import("@/pages/GroupDetailPage"));
const BudgetPage = lazy(() => import("@/pages/BudgetPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TermsOfServicePage = lazy(() => import("@/pages/TermsOfServicePage"));
const GoodbyePage = lazy(() => import("@/pages/GoodbyePage"));
const InviteAcceptPage = lazy(() => import("@/pages/InviteAcceptPage"));

function PageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <Skeleton className="h-40 w-full max-w-md rounded-xl" />
    </div>
  );
}

function PageLoaderShell() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  return (
    <PageLoader isLoading={isNavigating}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </PageLoader>
  );
}

/** Lets the data router enter `navigation.state === "loading"` on each transition (React.lazy on `element` alone does not). */
function routeLoader() {
  return null;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <AuthProvider>
          <PageLoaderShell />
        </AuthProvider>
      }
    >
      <Route path="/auth" element={<LoginPage />} loader={routeLoader} />
      <Route path="/login" element={<LoginPage />} loader={routeLoader} />
      <Route path="/register" element={<RegisterPage />} loader={routeLoader} />
      <Route path="/terms" element={<TermsOfServicePage />} loader={routeLoader} />
      <Route path="/goodbye" element={<GoodbyePage />} loader={routeLoader} />
      <Route path="/verify-email-code" element={<VerifyEmailCodePage />} loader={routeLoader} />
      <Route path="/invitations/accept" element={<InviteAcceptPage />} loader={routeLoader} />
      <Route element={<ProtectedLayout />} loader={routeLoader}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} loader={routeLoader} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} loader={routeLoader} />
        <Route path="/dashboard" element={<DashboardPage />} loader={routeLoader} />
        <Route path="/expenses" element={<ExpensesPage />} loader={routeLoader} />
        <Route path="/groups" element={<GroupsPage />} loader={routeLoader} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} loader={routeLoader} />
        <Route path="/budget" element={<BudgetPage />} loader={routeLoader} />
        <Route path="/reports" element={<ReportsPage />} loader={routeLoader} />
        <Route path="/settings" element={<SettingsPage />} loader={routeLoader} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} loader={routeLoader} />
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}
