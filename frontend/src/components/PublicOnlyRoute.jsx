import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loading from './Loading';

// connexion et inscription réservées aux visiteurs non connectés
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/tasks" replace />;
  return children;
}
