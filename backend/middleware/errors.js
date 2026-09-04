/** routes inconnues et erreurs @module middleware/errors */
const config = require('../config/env');
const logger = require('../utils/logger');

/** 404 en json pour toute route inconnue */
function notFound(req, res) {
  res.status(404).json({ msg: `Route ${req.method} ${req.originalUrl} introuvable` });
}

/**
 * gestionnaire d'erreurs final
 * @param {Error} err peut porter status, code 11000 (doublon), type (body-parser) ou errors (mongoose)
 */
function errorHandler(err, req, res, _next) {
  // fix : express 5 envoie aussi les promesses rejetées ici, l'ancien handler ne voyait que le synchrone
  // fix : validation et id invalides en 400, doublon en 409, corps trop gros en 413, plus de 500 partout
  let status = err.status || err.statusCode || 500;
  let msg = 'Erreur interne du serveur';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    msg = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ; ');
  } else if (err.name === 'CastError') {
    status = 400;
    msg = 'Identifiant invalide';
  } else if (err.code === 11000) {
    status = 409;
    msg = 'Cette valeur existe déjà';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    msg = 'Corps de requête JSON invalide';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    msg = 'Corps de requête trop volumineux';
  } else if (status < 500 && err.message) {
    msg = err.message;
  }

  if (status >= 500) {
    logger.error(err.stack || err.message, { method: req.method, path: req.originalUrl });
  } else {
    logger.warn(`Erreur ${status} : ${msg}`, { method: req.method, path: req.originalUrl });
  }

  // pas de détail technique en prod
  const body = { msg };
  if (!config.isProd && status >= 500) body.detail = err.message;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
