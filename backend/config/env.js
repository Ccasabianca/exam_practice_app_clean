/** configuration validée depuis les variables d'environnement @module config/env */
require('dotenv').config({ quiet: true });
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),
  MONGO_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required()
    .messages({
      'string.pattern.base': 'MONGO_URI doit commencer par mongodb:// ou mongodb+srv://',
    }),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min':
      'JWT_SECRET doit contenir au moins 32 caractères (voir .env.example pour le générer)',
    'any.required': 'JWT_SECRET est obligatoire',
  }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)?$/)
    .default('1h'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  TRUST_PROXY: Joi.boolean().default(false),
  RATE_LIMIT_AUTH_MAX: Joi.number().integer().min(1).default(20),
}).unknown(true);

// fix : le serveur refuse de démarrer si une variable manque ou si JWT_SECRET fait moins de 32 caractères
const { value: env, error } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  const details = error.details.map((d) => d.message).join(' ; ');
  throw new Error(`Configuration invalide : ${details}`);
}

if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
  throw new Error(
    'Configuration invalide : COOKIE_SAMESITE=none exige COOKIE_SECURE=true (exigence des navigateurs)'
  );
}

/** convertit "1h", "30m", "7d" ou "3600" (secondes) en millisecondes */
function durationToMs(duration) {
  const match = /^(\d+)(s|m|h|d)?$/.exec(String(duration));
  const factors = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * factors[match[2] || 's'];
}

module.exports = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  mongoUri: env.MONGO_URI,
  jwtSecret: env.JWT_SECRET,
  // jsonwebtoken lit "3600" comme 3600 ms, on convertit en nombre de secondes
  jwtExpiresIn: /^\d+$/.test(env.JWT_EXPIRES_IN) ? Number(env.JWT_EXPIRES_IN) : env.JWT_EXPIRES_IN,
  jwtExpiresInMs: durationToMs(env.JWT_EXPIRES_IN),
  corsOrigins: env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: env.COOKIE_SECURE,
  cookieSameSite: env.COOKIE_SAMESITE,
  logLevel: env.LOG_LEVEL,
  trustProxy: env.TRUST_PROXY,
  rateLimitAuthMax: env.RATE_LIMIT_AUTH_MAX,
});
