import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// fix : un seul header, avant deux imbriqués avec deux css qui se contredisaient
export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // fix : la déconnexion appelle l'api puis redirige vers la connexion
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-header">
      <nav aria-label="Navigation principale">
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/tasks" className="nav-link">
              Mes Tâches
            </Link>
          </li>
          {!isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Connexion
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">
                  Inscription
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item nav-user">{user.username}</li>
              <li className="nav-item">
                <button type="button" onClick={handleLogout} className="nav-link nav-button">
                  Déconnexion
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
