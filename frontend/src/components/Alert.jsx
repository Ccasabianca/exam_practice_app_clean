/** message de retour utilisateur, role alert pour les erreurs */
export default function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          onClick={onClose}
          aria-label="Fermer le message"
        >
          ×
        </button>
      )}
    </div>
  );
}
