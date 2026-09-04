import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Alert from '../components/Alert';
import { getErrorMessage } from '../api';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/;
const PASSWORD_MIN = 8;

// fix : mêmes règles que l'api côté client, confirmation du mot de passe, connexion directe après inscription
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!USERNAME_PATTERN.test(username.trim())) {
      return "Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, . _ -";
    }
    if (password.length < PASSWORD_MIN) {
      return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
    }
    if (password !== confirm) {
      return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await register(username.trim(), password);
      navigate('/tasks', {
        replace: true,
        state: { message: `Bienvenue ${user.username}, votre compte est créé.` },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Inscription impossible'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>Inscription</h1>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="register-username">Nom d&apos;utilisateur</label>
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-password">Mot de passe</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-confirm">Confirmation du mot de passe</label>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          Créer mon compte
        </button>
      </form>
      <p className="form-footer">
        Déjà inscrit ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  );
}
