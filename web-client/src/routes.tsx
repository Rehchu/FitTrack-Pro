import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { MeasurementPage } from './pages/MeasurementPage';
import { MealPlanPage } from './pages/MealPlanPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { useAuthStore } from './stores/authStore';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuthStore();
  const bypass = import.meta?.env?.VITE_DEV_BYPASS_AUTH === 'true';

  if (bypass) return children;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
      <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
      <Route path="/clients/:clientId" element={<RequireAuth><ClientDetailPage /></RequireAuth>} />
      <Route path="/clients/:clientId/measurements" element={<RequireAuth><MeasurementPage isTrainer={true} /></RequireAuth>} />
      <Route path="/clients/:clientId/meals" element={<RequireAuth><MealPlanPage /></RequireAuth>} />
      
      {/* Public route - no auth required */}
      <Route path="/profile/:token" element={<PublicProfilePage />} />
      <Route path="/client/:clientname" element={<PublicProfilePage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}