/** authentification par cookie httponly @module middleware/auth */
const { COOKIE_NAME, verifyToken } = require('../utils/token');
const logger = require('../utils/logger');

/** vérifie le jeton du cookie et remplit req.user */
function auth(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : undefined;

  if (!token) {
    return res.status(401).json({ msg: 'Authentification requise', code: 'NO_TOKEN' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    // fix : 401 au lieu de 418 pour un jeton invalide, expiration distinguée et rejet journalisé
    const expired = err.name === 'TokenExpiredError';
    logger.warn('auth.token_rejected', { reason: err.name, ip: req.ip, path: req.originalUrl });
    return res.status(401).json({
      msg: expired ? 'Session expirée, veuillez vous reconnecter' : 'Jeton invalide',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
}

module.exports = auth;
