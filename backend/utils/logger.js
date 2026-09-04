/** journalisation winston, json en prod, lisible en dev @module utils/logger */
const winston = require('winston');
const config = require('../config/env');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const readable = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  delete meta.service;
  delete meta.env;
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${stack || message}${extra}`;
});

// fix : remplace les console.log, niveau piloté par LOG_LEVEL
const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'todo-api', env: config.env },
  format: config.isProd
    ? combine(timestamp(), errors({ stack: true }), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), readable),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
