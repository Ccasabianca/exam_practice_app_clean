/** validation des entrées avec joi @module middleware/validate */

const MESSAGES_FR = {
  'any.required': '{{#label}} est obligatoire',
  'any.only': '{{#label}} a une valeur non autorisée',
  'string.base': '{{#label}} doit être une chaîne de caractères',
  'string.empty': '{{#label}} ne peut pas être vide',
  'string.min': '{{#label}} doit contenir au moins {{#limit}} caractères',
  'string.max': '{{#label}} ne peut pas dépasser {{#limit}} caractères',
  'string.pattern.base': '{{#label}} a un format invalide',
  'boolean.base': '{{#label}} doit être vrai ou faux',
  'object.base': 'Le corps de la requête doit être un objet JSON',
  'object.min': 'Au moins un champ à modifier est requis',
};

/**
 * middleware qui valide req[property] avec un schéma joi, 400 si invalide
 * @param {Joi.Schema} schema
 * @param {string} [property='body'] body, params ou query
 * @returns {express.RequestHandler}
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    // fix : types stricts et champs inconnus supprimés, un objet à la place d'une chaîne est refusé
    // ça bloque les injections type {"$gt": ""} et l'écrasement de champs comme user
    const { value, error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      messages: MESSAGES_FR,
      errors: { wrap: { label: false } },
    });

    if (error) {
      return res.status(400).json({
        msg: 'Données invalides',
        errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
      });
    }

    if (property === 'body') req.body = value;
    return next();
  };
}

module.exports = validate;
