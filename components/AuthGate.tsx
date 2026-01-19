
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
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const user = await apiMe();
        onUserLoaded(user);
        setAuthenticated(true);
      } catch (err) {
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
      localStorage.setItem('auth_token', data.token);
      onUserLoaded(data.user);
      setAuthenticated(true);
    }} />;
  }

  return <>{children}</>;
};

export default AuthGate;
