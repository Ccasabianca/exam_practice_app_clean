/** routes des tâches, toutes authentifiées @module routes/tasks */
const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');
const logger = require('../utils/logger');

const router = express.Router();

router.use(auth);

/** charge une tâche et vérifie qu'elle appartient à l'utilisateur courant, sinon 404 ou 403 */
async function loadOwnedTask(req, res) {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404).json({ msg: 'Tâche introuvable' });
    return null;
  }

  // fix : avant n'importe qui connecté pouvait modifier ou supprimer la tâche d'un autre (idor), tentative journalisée
  if (task.user.toString() !== req.user.id) {
    logger.warn('task.forbidden_access', {
      userId: req.user.id,
      taskId: task.id,
      ownerId: task.user.toString(),
      method: req.method,
      ip: req.ip,
    });
    res.status(403).json({ msg: 'Accès refusé : cette tâche ne vous appartient pas' });
    return null;
  }

  return task;
}

/**
 * GET /api/tasks : tâches de l'utilisateur, plus récentes d'abord
 * @name GET/api/tasks
 * @function
 */
router.get('/', async (req, res) => {
  const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(tasks);
});

/**
 * POST /api/tasks : crée une tâche
 * @name POST/api/tasks
 * @function
 */
router.post('/', validate(schemas.createTask), async (req, res) => {
  // fix : titre validé et nettoyé, un formulaire vide renvoie 400 au lieu de 500, le propriétaire est toujours l'utilisateur courant
  const task = await Task.create({ ...req.body, user: req.user.id });
  logger.info('task.created', { userId: req.user.id, taskId: task.id });
  res.status(201).json(task);
});

/**
 * PUT /api/tasks/:id : modifie titre, description ou état
 * @name PUT/api/tasks/:id
 * @function
 */
router.put(
  '/:id',
  // fix : un id mal formé renvoie 400 au lieu de 500
  validate(schemas.taskIdParams, 'params'),
  validate(schemas.updateTask),
  async (req, res) => {
    const task = await loadOwnedTask(req, res);
    if (!task) return;

    Object.assign(task, req.body);
    await task.save();

    logger.info('task.updated', {
      userId: req.user.id,
      taskId: task.id,
      fields: Object.keys(req.body),
    });
    res.json(task);
  }
);

/**
 * DELETE /api/tasks/:id : supprime une tâche
 * @name DELETE/api/tasks/:id
 * @function
 */
router.delete('/:id', validate(schemas.taskIdParams, 'params'), async (req, res) => {
  const task = await loadOwnedTask(req, res);
  if (!task) return;

  // fix : findByIdAndRemove n'existe plus dans mongoose 8+
  await task.deleteOne();
  logger.info('task.deleted', { userId: req.user.id, taskId: task.id });
  res.json({ msg: 'Tâche supprimée', id: task.id });
});

module.exports = router;
