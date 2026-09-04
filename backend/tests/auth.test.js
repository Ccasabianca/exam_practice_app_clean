const jwt = require('jsonwebtoken');
const {
  app,
  request,
  connect,
  clearDatabase,
  disconnect,
  registerUser,
  extractCookie,
} = require('./helpers');

describe('Authentification', () => {
  beforeAll(connect);
  beforeEach(clearDatabase);
  afterAll(disconnect);

  describe('POST /api/auth/register', () => {
    test('crée un compte, renvoie 201 et pose un cookie HttpOnly sans exposer le jeton', async () => {
      const { res } = await registerUser('alice', 'motdepasse123');
      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('alice');
      expect(res.body.token).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toMatch(/^token=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
    });

    test('refuse un mot de passe trop court (politique : 8 caractères minimum)', async () => {
      const { res } = await registerUser('alice', '1');
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('password');
      expect(res.body.errors[0].message).toMatch(/8 caractères/);
    });

    test("refuse un nom d'utilisateur trop court ou avec des caractères interdits", async () => {
      const court = await registerUser('a', 'motdepasse123');
      expect(court.res.status).toBe(400);
      const interdit = await registerUser('<script>', 'motdepasse123');
      expect(interdit.res.status).toBe(400);
    });

    test('refuse un formulaire vide', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.field).sort()).toEqual(['password', 'username']);
    });

    test('refuse un doublon avec 409', async () => {
      await registerUser('alice');
      const { res } = await registerUser('alice');
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => registerUser('alice', 'motdepasse123'));

    test('connecte un utilisateur valide et pose le cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'motdepasse123' });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('alice');
      expect(extractCookie(res)).toMatch(/^token=/);
    });

    test('renvoie 401 avec le même message pour un mauvais mot de passe et un compte inconnu', async () => {
      const mauvais = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'mauvais-mot-de-passe' });
      const inconnu = await request(app)
        .post('/api/auth/login')
        .send({ username: 'personne', password: 'motdepasse123' });
      expect(mauvais.status).toBe(401);
      expect(inconnu.status).toBe(401);
      expect(mauvais.body.msg).toBe(inconnu.body.msg);
    });

    test("bloque l'injection NoSQL : un objet à la place du nom d'utilisateur est rejeté en 400", async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: { $gt: '' }, password: 'motdepasse123' });
      expect(res.status).toBe(400);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('Session (GET /api/auth/me, POST /api/auth/logout)', () => {
    test('sonde de session sans cookie : 200 avec user null (aucune erreur parasite)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
    });

    test('avec cookie : renvoie le profil', async () => {
      const { cookie } = await registerUser('alice');
      const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('alice');
    });

    test('un cookie de session forgé est effacé et la session est nulle', async () => {
      const res = await request(app).get('/api/auth/me').set('Cookie', 'token=abc.def.ghi');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
      expect(res.headers['set-cookie'][0]).toMatch(/^token=;/);
    });

    test('route protégée sans cookie : 401 NO_TOKEN', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    test('route protégée avec un jeton forgé : 401 (et non 418)', async () => {
      const res = await request(app).get('/api/tasks').set('Cookie', 'token=abc.def.ghi');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_INVALID');
    });

    test('route protégée avec un jeton expiré : 401 avec le code TOKEN_EXPIRED', async () => {
      const expired = jwt.sign({ sub: 'x', username: 'x' }, process.env.JWT_SECRET, {
        expiresIn: -10,
      });
      const res = await request(app).get('/api/tasks').set('Cookie', `token=${expired}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    test('logout efface le cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/^token=;/);
    });
  });
});
