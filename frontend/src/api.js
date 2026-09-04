import axios from 'axios';

// fix : url de l'api par variable d'environnement (avant localhost en dur) et cookie de session envoyé automatiquement
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// sur un 401 hors /auth, on prévient AuthProvider qui ferme la session côté client
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** transforme une erreur axios en message lisible pour l'utilisateur */
export function getErrorMessage(err, fallback = 'Une erreur est survenue') {
  const data = err?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => e.message).join(' ');
  }
  if (data?.msg) return data.msg;
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return fallback;
}

export default api;
