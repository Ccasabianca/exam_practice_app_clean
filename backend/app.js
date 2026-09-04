/** application express : sécurité, routes, erreurs (séparée de server.js pour les tests) @module app */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const config = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errors');
const pkg = require('./package.json');

const app = express();

// fix : en-têtes de sécurité (helmet) et x-powered-by masqué
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy ? 1 : false);
app.use(helmet());

// fix : cors limité aux origines de CORS_ORIGIN, avant tout le monde passait
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      logger.warn('cors.blocked', { origin });
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  })
);

// fix : corps json limité à 10 ko
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(requestLogger);

/** sonde de santé, 503 si la base n'est pas joignable */
function healthCheck(_req, res) {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    version: pkg.version,
    env: config.env,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// fix : 404 en json et gestion centralisée des erreurs
app.use(notFound);
app.use(errorHandler);

module.exports = app;
