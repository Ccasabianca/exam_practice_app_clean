const { app, request, connect, disconnect } = require('./helpers');

describe('Infrastructure et durcissement HTTP', () => {
  beforeAll(connect);
  afterAll(disconnect);

  test("GET /health répond 200 avec l'état de la base", async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.version).toBeDefined();
  });

  test('une route inconnue renvoie un 404 JSON et non une page HTML', async () => {
    const res = await request(app).get('/api/inexistante');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.msg).toMatch(/introuvable/);
  });

  test('les en-têtes de sécurité sont présents et X-Powered-By absent', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  test('CORS : une origine autorisée est reflétée avec credentials', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test("CORS : une origine inconnue n'obtient aucun en-tête d'autorisation", async () => {
    const res = await request(app).get('/health').set('Origin', 'http://site-malveillant.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('un corps JSON mal formé renvoie 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username": ');
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/JSON invalide/);
  });

  test('un corps de plus de 10 ko renvoie 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'a'.repeat(20000), password: 'x' });
    expect(res.status).toBe(413);
  });
});
