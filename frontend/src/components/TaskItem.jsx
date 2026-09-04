import { useState } from 'react';
import { getErrorMessage } from '../api';

// fix : on peut cocher et modifier une tâche, la route put existait mais l'interface ne l'utilisait pas
export default function TaskItem({ task, onToggle, onUpdate, onDelete, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [busy, setBusy] = useState(false);

  const run = async (action, fallback) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onError(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) {
      onError('Le titre ne peut pas être vide.');
      return;
    }
    if (title === task.title) {
      setEditing(false);
      return;
    }
    await run(async () => {
      await onUpdate(task._id, { title });
      setEditing(false);
    }, 'Impossible de modifier la tâche');
  };

  const cancel = () => {
    setDraft(task.title);
    setEditing(false);
  };

  return (
    <li className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-check"
        checked={task.isCompleted}
        disabled={busy}
        onChange={() => run(() => onToggle(task), "Impossible de changer l'état de la tâche")}
        aria-label={`Marquer « ${task.title} » comme ${task.isCompleted ? 'à faire' : 'terminée'}`}
      />

      {editing ? (
        <form className="task-edit" onSubmit={save}>
          <input
            type="text"
            value={draft}
            maxLength={200}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && cancel()}
            aria-label="Nouveau titre"
          />
          <button type="submit" className="btn btn-small" disabled={busy}>
            Enregistrer
          </button>
          <button type="button" className="btn btn-small btn-secondary" onClick={cancel}>
            Annuler
          </button>
        </form>
      ) : (
        <div className="task-body">
          <span className="task-title">{task.title}</span>
          {task.description && <span className="task-description">{task.description}</span>}
        </div>
      )}

      {!editing && (
        <div className="task-actions">
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={() => setEditing(true)}
            disabled={busy}
          >
            Modifier
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            onClick={() => run(() => onDelete(task._id), 'Impossible de supprimer la tâche')}
            disabled={busy}
          >
            Supprimer
          </button>
        </div>
      )}
    </li>
  );
}
