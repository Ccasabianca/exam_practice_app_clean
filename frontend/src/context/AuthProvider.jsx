import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { AuthContext } from './auth-context';

/** fournit la session à l'application */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // message affiché sur la page de connexion après déconnexion ou expiration, porté par le contexte
  // plutôt que par l'état de navigation, sinon il dépend de l'ordre des redirections
  const [sessionNotice, setSessionNotice] = useState('');

  // fix : plus de jeton dans localstorage, la session est un cookie httponly vérifié via /auth/me au chargement
  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setSessionNotice('Votre session a expiré, veuillez vous reconnecter.');
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setSessionNotice('');
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (username, password) => {
    const res = await api.post('/auth/register', { username, password });
    setSessionNotice('');
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setSessionNotice('Vous êtes déconnecté.');
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      sessionNotice,
      login,
      register,
      logout,
    }),
    [user, loading, sessionNotice, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
