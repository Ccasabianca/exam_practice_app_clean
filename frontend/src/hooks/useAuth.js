import { useContext } from 'react';
import { AuthContext } from '../context/auth-context';

/** accès au contexte de session */
export default function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}
