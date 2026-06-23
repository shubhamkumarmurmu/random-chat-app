import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const res = await api.get('/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        if (!cancelled) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    localStorage.setItem('token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (username, email, password) => {
    const res = await api.post('/register', { username, email, password });
    localStorage.setItem('token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  async function logout  () {
    try {
      const res = await api.post('/logout');
      console.log(res.data.message);
    } catch (error) {
      console.log("logout error", error);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
