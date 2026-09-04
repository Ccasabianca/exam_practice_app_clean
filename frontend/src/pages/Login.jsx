import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Alert from '../components/Alert';
import { getErrorMessage } from '../api';

// fix : formulaire vide refusé et message d'erreur du serveur affiché, avant rien ne s'affichait
export default function Login() {
  const { login, sessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // priorité : événement de session, puis message de la page précédente, puis invitation si on vient d'une page protégée
  let info = sessionNotice || location.state?.message || '';
  if (!info && location.state?.from) {
    info = 'Veuillez vous connecter pour accéder à cette page.';
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Veuillez saisir votre nom d'utilisateur et votre mot de passe.");
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(location.state?.from || '/tasks', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Connexion impossible'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>Connexion</h1>
      <Alert type="info">{info}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-username">Nom d&apos;utilisateur</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          Se connecter
        </button>
      </form>
      <p className="form-footer">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </div>
  );
}
