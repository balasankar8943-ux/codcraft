// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import LoginSignUp from './components/LoginSignUp';

// Dedicated pages
import PracticePage     from './pages/PracticePage';
import MNCPage          from './pages/MNCPage';
import LeaderboardPage  from './pages/LeaderboardPage';
import CertificatesPage from './pages/CertificatesPage';
import QuestionPage     from './pages/QuestionPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (appId) {
      const OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred = OneSignalDeferred;
      OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
            position: 'bottom-right',
            size: 'medium',
          },
        });
      });
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0c0b', color: '#ffffff', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const Guard: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    user ? <>{children}</> : <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/login" element={<LoginSignUp />} />

      {/* Practice Arena (home) */}
      <Route path="/" element={<Guard><PracticePage /></Guard>} />

      {/* Full-screen question editor */}
      <Route path="/question/:id" element={<Guard><QuestionPage /></Guard>} />

      {/* Section pages */}
      <Route path="/mnc"          element={<Guard><MNCPage /></Guard>} />
      <Route path="/leaderboard"  element={<Guard><LeaderboardPage /></Guard>} />
      <Route path="/certificates" element={<Guard><CertificatesPage /></Guard>} />
      
      {/* Admin notifications page */}
      <Route path="/admin-notifications" element={<Guard><AdminNotificationsPage /></Guard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
