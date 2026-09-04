/** connexion mongodb @module config/db */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/** ouvre la connexion et journalise les événements de cycle de vie */
async function connectDB(uri) {
  mongoose.connection.on('error', (err) => logger.error(`Erreur MongoDB : ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnecté'));

  // fix : options useNewUrlParser et useUnifiedTopology retirées, sans effet depuis mongoose 6
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connecté', { host: conn.connection.host, db: conn.connection.name });
  return conn;
}

module.exports = connectDB;
