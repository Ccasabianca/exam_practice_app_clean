import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

// fix : la liste se met à jour tout de suite après ajout, modification ou suppression, avant il fallait recharger
export default function Tasks() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // message de la page précédente lu dans un effet car la page peut être montée par une première
  // redirection avant de recevoir l'état, puis effacé pour ne pas revenir au rechargement
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // fix : chargement protégé, les erreurs s'affichent au lieu de partir en console
  useEffect(() => {
    let cancelled = false;
    api
      .get('/tasks')
      .then((res) => {
        if (!cancelled) setTasks(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Impossible de charger les tâches'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const addTask = useCallback(async (data) => {
    const res = await api.post('/tasks', data);
    setTasks((prev) => [res.data, ...prev]);
    setSuccess('Tâche ajoutée.');
  }, []);

  const updateTask = useCallback(async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data);
    setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
  }, []);

  const toggleTask = useCallback(
    (task) => updateTask(task._id, { isCompleted: !task.isCompleted }),
    [updateTask]
  );

  const deleteTask = useCallback(async (id) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t._id !== id));
    setSuccess('Tâche supprimée.');
  }, []);

  return (
    <div className="container">
      <h1>Mes Tâches</h1>
      <TaskForm onAdd={addTask} />
      <Alert type="success" onClose={() => setSuccess('')}>
        {success}
      </Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <Loading label="Chargement des tâches…" />
      ) : (
        <>
          {tasks.length === 0 && <p className="task-empty">Aucune tâche pour le moment.</p>}
          <ul className="task-list">
            {tasks.map((task) => (
              <TaskItem
                key={task._id}
                task={task}
                onToggle={toggleTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onError={setError}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
