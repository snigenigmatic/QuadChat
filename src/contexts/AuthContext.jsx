import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Auth check failed:', errorData);
        localStorage.removeItem('token');
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Auth check response:', data);

      if (data.status === 'success' && data.data?.user) {
        setCurrentUser(data.data.user);
      } else {
        localStorage.removeItem('token');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token available for status update');
        return;
      }

      const response = await fetch('/api/auth/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update status:', errorData);
        if (response.status === 401) {
          // Token might be invalid
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
        return;
      }

      const data = await response.json();
      
      // Update user status in context if needed
      if (currentUser) {
        setCurrentUser(prev => ({
          ...prev,
          status: data.data.status
        }));
      }

      return data;
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.status === 'success' && data.data?.token) {
        const token = data.data.token;
        localStorage.setItem('token', token);
        setCurrentUser(data.data.user);
        
        // Don't wait for status update
        updateUserStatus('online').catch(console.error);
        return true;
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login');
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Update status to offline before logging out
        await updateUserStatus('offline');
        
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    updateUserStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
