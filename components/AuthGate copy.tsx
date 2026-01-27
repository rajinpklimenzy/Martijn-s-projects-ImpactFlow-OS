
import React, { useState, useEffect } from 'react';
import { apiMe } from '../utils/api.ts';
import Auth from './Auth.tsx';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
  onUserLoaded: (user: any) => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ children, onUserLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      
      if (!token) {
        // Clear any stale user data
        if (storedUser) {
          localStorage.removeItem('user_data');
        }
        setLoading(false);
        return;
      }

      // Try to restore user from localStorage first for instant loading
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          onUserLoaded(user);
          setAuthenticated(true);
          setLoading(false);
          
          // Verify session is still valid in background (non-blocking)
          apiMe()
            .then((freshUser) => {
              // Update stored user data if different
              const userData = freshUser.data || freshUser;
              const currentStored = JSON.parse(localStorage.getItem('user_data') || '{}');
              if (JSON.stringify(userData) !== JSON.stringify(currentStored)) {
                localStorage.setItem('user_data', JSON.stringify(userData));
                onUserLoaded(userData);
              }
            })
            .catch((err) => {
              // Session invalid, clear and redirect to login
              console.warn('Session expired:', err);
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_data');
              window.location.reload(); // Reload to show login
            });
          return;
        } catch (err) {
          // Invalid stored data, clear it
          localStorage.removeItem('user_data');
        }
      }

      // No stored user, fetch from API
      try {
        const response = await apiMe();
        const user = response.data || response;
        localStorage.setItem('user_data', JSON.stringify(user));
        onUserLoaded(user);
        setAuthenticated(true);
      } catch (err) {
        // Session invalid
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [onUserLoaded]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Establishing secure session...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Auth onLogin={(data) => {
      // Store token and user data in localStorage
      localStorage.setItem('auth_token', data.token || data.data?.token);
      const user = data.user || data.data?.user || data.data;
      if (user) {
        localStorage.setItem('user_data', JSON.stringify(user));
        onUserLoaded(user);
      }
      setAuthenticated(true);
    }} />;
  }

  return <>{children}</>;
};

export default AuthGate;
