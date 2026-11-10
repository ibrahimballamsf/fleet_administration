import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import AppShell from "./components/AppShell.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const VehiclesPage = lazy(() => import("./pages/VehiclesPage.jsx"));
const MapPage = lazy(() => import("./pages/MapPage.jsx"));
const TelemetryPage = lazy(() => import("./pages/TelemetryPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));

function AuthenticatedShell() {
  const { authenticated, initializing } = useAuth();
  if (initializing) {
    return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress aria-label="Restoring session" /></Box>;
  }
  return authenticated ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress aria-label="Loading page" /></Box>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthenticatedShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
