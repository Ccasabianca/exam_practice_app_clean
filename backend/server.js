/** point d'entrée : configuration, mongodb, écoute http, arrêt propre @module server */
let config;
try {
  config = require('./config/env');
} catch (err) {
  // le logger dépend de la config, on écrit directement sur stderr
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const mongoose = require('mongoose');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  await connectDB(config.mongoUri);

  const server = app.listen(config.port, () => {
    logger.info(`API démarrée sur le port ${config.port}`, {
      env: config.env,
      corsOrigins: config.corsOrigins,
    });
  });

  // fix : arrêt propre sur sigint et sigterm, mongodb fermé avant de quitter
  const shutdown = (signal) => {
    logger.info(`Signal ${signal} reçu, arrêt en cours`);
    server.close(async () => {
      await mongoose.disconnect();
      logger.info('Arrêt terminé');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Promesse rejetée non gérée : ${reason instanceof Error ? reason.stack : reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Exception non interceptée : ${err.stack}`);
  process.exit(1);
});

start().catch((err) => {
  logger.error(`Démarrage impossible : ${err.message}`);
  process.exit(1);
});
