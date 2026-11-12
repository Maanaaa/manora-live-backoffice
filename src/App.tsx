import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/States';
import { LiveProvider } from './live/LiveContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Zone protégée : réservée aux administrateurs connectés. */
function RequireAdmin() {
  const { status, user, retry, logout } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <Loading label="Vérification de la session…" />;
  if (status === 'unreachable') {
    return (
      <div className="centered">
        <div className="card state state-error" role="alert">
          <p className="state-title">API injoignable</p>
          <p className="muted">Impossible de vérifier votre session pour le moment.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={retry}>
              Réessayer
            </button>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (status !== 'authenticated' || user?.role !== 'admin') {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return (
    <LiveProvider>
      <Layout />
    </LiveProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<RequireAdmin />}>
        <Route index element={<DashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
