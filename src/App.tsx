import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import LoginSignUp from './components/LoginSignUp';
import HomePage from './components/HomePage';

const App: React.FC = () => {
  const { user } = useAuth();

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return user ? children : <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginSignUp />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mnc"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
