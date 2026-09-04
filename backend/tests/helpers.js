const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
}

async function clearDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map((c) => c.split(';')[0])
    .join('; ');
}

async function registerUser(username = 'alice', password = 'motdepasse123') {
  const res = await request(app).post('/api/auth/register').send({ username, password });
  return { res, cookie: extractCookie(res) };
}

module.exports = { app, request, connect, clearDatabase, disconnect, extractCookie, registerUser };
