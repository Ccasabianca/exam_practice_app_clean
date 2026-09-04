import { Link } from 'react-router-dom';

// fix : page 404, avant écran vide sur une url inconnue
export default function NotFound() {
  return (
    <div className="container">
      <h1>Page introuvable</h1>
      <p>L&apos;adresse demandée n&apos;existe pas.</p>
      <p className="form-footer">
        <Link to="/">Retour à l&apos;accueil</Link>
      </p>
    </div>
  );
}
