import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { MeasurementPage } from './pages/MeasurementPage';
import { MealPlanPage } from './pages/MealPlanPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { TrainerSettingsPage } from './pages/TrainerSettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientPublicProfile } from './pages/ClientPublicProfile';
import { SettingsPage } from './pages/SettingsPage';
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
      <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      <Route path="/trainer-settings" element={<RequireAuth><TrainerSettingsPage /></RequireAuth>} />
      
      {/* Public routes - no auth required */}
      <Route path="/profile/:token" element={<PublicProfilePage />} />
      <Route path="/client/:clientname" element={<ClientPublicProfile />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}