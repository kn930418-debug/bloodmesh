import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setToken, getToken, errMsg } from '../lib/api.js';
import { connectSocket, disconnectSocket } from '../lib/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const boot = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      connectSocket(token);
    } catch {
      setToken('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    boot();
    const onLogout = () => {
      setUser(null);
      disconnectSocket();
    };
    window.addEventListener('bm:logout', onLogout);
    return () => window.removeEventListener('bm:logout', onLogout);
  }, [boot]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    connectSocket(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token);
    connectSocket(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken('');
    disconnectSocket();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn(errMsg(err));
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
