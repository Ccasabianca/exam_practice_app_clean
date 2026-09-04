/** routes d'authentification @module routes/auth */
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const schemas = require('../validators/schemas');
const {
  COOKIE_NAME,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../utils/token');
const logger = require('../utils/logger');

const router = express.Router();

// fix : même temps de réponse quand le compte n'existe pas, on compare avec un hachage factice
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 12);

function publicUser(user) {
  return { id: user.id, username: user.username };
}

/**
 * POST /api/auth/register : crée le compte et ouvre la session
 * @name POST/api/auth/register
 * @function
 */
router.post('/register', authLimiter, validate(schemas.register), async (req, res) => {
  // fix : identifiant et mot de passe validés (avant "a" et "1" passaient), 201, doublon en 409
  // fix : le jeton part dans un cookie httponly, plus dans le corps de la réponse
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ msg: "Ce nom d'utilisateur est déjà pris" });
  }

  const user = await User.create({ username, password });
  logger.info('auth.register', { userId: user.id, username: user.username, ip: req.ip });

  setAuthCookie(res, signToken(user));
  return res.status(201).json({ user: publicUser(user) });
});

/**
 * POST /api/auth/login : authentifie et pose le cookie de session
 * @name POST/api/auth/login
 * @function
 */
router.post('/login', authLimiter, validate(schemas.login), async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select('+password');
  const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  // fix : même message pour compte inconnu et mauvais mot de passe, pas d'énumération des comptes
  if (!user || !isMatch) {
    logger.warn('auth.login_failed', { username, ip: req.ip });
    return res.status(401).json({ msg: 'Identifiants invalides' });
  }

  logger.info('auth.login', { userId: user.id, ip: req.ip });
  setAuthCookie(res, signToken(user));
  return res.json({ user: publicUser(user) });
});

/**
 * POST /api/auth/logout : efface le cookie de session
 * @name POST/api/auth/logout
 * @function
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ msg: 'Déconnexion effectuée' });
});

/**
 * GET /api/auth/me : sonde de session, toujours 200, user à null sans session valide
 * (un cookie expiré ou forgé est effacé au passage, pas de 401 parasite au chargement)
 * @name GET/api/auth/me
 * @function
 */
router.get('/me', async (req, res) => {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : undefined;
  if (!token) return res.json({ user: null });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    logger.warn('auth.session_cookie_rejected', { reason: err.name, ip: req.ip });
    clearAuthCookie(res);
    return res.json({ user: null });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    clearAuthCookie(res);
    return res.json({ user: null });
  }
  return res.json({ user: publicUser(user) });
});

module.exports = router;
