/** schémas joi des entrées @module validators/schemas */
const Joi = require('joi');
const { stripHtml } = require('../utils/sanitize');

const stripRule = (value) => stripHtml(value);

const username = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9._-]+$/)
  .label("Le nom d'utilisateur")
  .messages({
    'string.pattern.base':
      '{{#label}} ne peut contenir que des lettres, des chiffres et les caractères . _ -',
  });

// 72 : longueur maximale prise en compte par bcrypt
const password = Joi.string().min(8).max(72).label('Le mot de passe');

// fix : le html est retiré du titre et de la description, un titre vide après nettoyage est refusé
const title = Joi.string()
  .trim()
  .custom(stripRule, 'suppression du HTML')
  .min(1)
  .max(200)
  .label('Le titre')
  .messages({ 'string.min': '{{#label}} ne peut pas être vide' });

const description = Joi.string()
  .trim()
  .allow('')
  .custom(stripRule, 'suppression du HTML')
  .max(2000)
  .label('La description');

const isCompleted = Joi.boolean().label("L'état de la tâche");

const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .label("L'identifiant de tâche")
  .messages({ 'string.pattern.base': '{{#label}} est invalide' });

module.exports = {
  register: Joi.object({ username: username.required(), password: password.required() }),

  // login : contrôle de type et de taille seulement, la politique de mot de passe n'est pas révélée
  login: Joi.object({
    username: Joi.string().trim().max(30).required().label("Le nom d'utilisateur"),
    password: Joi.string().max(72).required().label('Le mot de passe'),
  }),

  createTask: Joi.object({ title: title.required(), description: description.default('') }),
  updateTask: Joi.object({ title, description, isCompleted }).min(1),
  taskIdParams: Joi.object({ id: objectId.required() }),
};
