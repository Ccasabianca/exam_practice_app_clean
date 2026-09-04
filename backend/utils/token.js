/** jetons jwt et cookie de session @module utils/token */
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const COOKIE_NAME = 'token';

/** signe un jeton pour un utilisateur */
function signToken(user) {
  // fix : appel synchrone, l'ancien callback faisait un throw qui pouvait planter le process
  return jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

// fix : cookie httponly, secure en prod, samesite, le js du navigateur ne voit jamais le jeton
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: config.jwtExpiresInMs });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
