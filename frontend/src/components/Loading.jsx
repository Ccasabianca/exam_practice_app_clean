export default function Loading({ label = 'Chargement…' }) {
  return (
    <p className="loading" role="status" aria-live="polite">
      {label}
    </p>
  );
}
