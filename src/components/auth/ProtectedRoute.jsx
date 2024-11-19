import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  console.log('Protected Route - Current location:', location.pathname);
  console.log('Protected Route - Auth state:', { currentUser, loading });

  if (loading) {
    console.log('Protected Route - Still loading auth state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!currentUser) {
    console.log('Protected Route - No user, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  console.log('Protected Route - User authenticated, rendering children');
  return children;
};

export default ProtectedRoute;
