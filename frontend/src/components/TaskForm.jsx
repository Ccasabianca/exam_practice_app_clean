import { useState } from 'react';
import Alert from './Alert';
import { getErrorMessage } from '../api';

const TITLE_MAX = 200;

// fix : titre vide bloqué avec un message, erreurs de l'api affichées, la liste se met à jour via onAdd
export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }
    if (cleanTitle.length > TITLE_MAX) {
      setError(`Le titre ne peut pas dépasser ${TITLE_MAX} caractères.`);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onAdd({ title: cleanTitle });
      setTitle('');
    } catch (err) {
      setError(getErrorMessage(err, "Impossible d'ajouter la tâche"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-group task-form" noValidate>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <input
        type="text"
        placeholder="Ajouter une tâche ..."
        aria-label="Titre de la tâche"
        value={title}
        maxLength={TITLE_MAX}
        onChange={(e) => setTitle(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      <button type="submit" className="btn task-form-btn" disabled={submitting}>
        Ajouter Tâche
      </button>
    </form>
  );
}
