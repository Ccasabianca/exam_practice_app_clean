// variables des tests, posées avant le chargement de config/env (dotenv n'écrase pas une variable déjà définie)
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/todo_test';
process.env.JWT_SECRET = 'secret-de-test-suffisamment-long-0123456789abcdef';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAMESITE = 'lax';
process.env.LOG_LEVEL = 'error';
