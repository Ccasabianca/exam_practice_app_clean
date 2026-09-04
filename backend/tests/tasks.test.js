const { app, request, connect, clearDatabase, disconnect, registerUser } = require('./helpers');

describe('Tâches', () => {
  let alice;
  let bob;

  beforeAll(connect);
  beforeEach(async () => {
    await clearDatabase();
    alice = (await registerUser('alice')).cookie;
    bob = (await registerUser('bob')).cookie;
  });
  afterAll(disconnect);

  const createTask = (cookie, body) =>
    request(app).post('/api/tasks').set('Cookie', cookie).send(body);

  test('sans authentification : 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  test('crée une tâche (201) et la renvoie', async () => {
    const res = await createTask(alice, { title: 'Acheter du pain', description: 'Complet' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Acheter du pain');
    expect(res.body.isCompleted).toBe(false);
    expect(res.body.__v).toBeUndefined();
  });

  test('un formulaire vide renvoie 400 avec un message clair (et non 500)', async () => {
    const res = await createTask(alice, {});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toMatch(/titre/i);
  });

  test("un titre composé uniquement d'espaces est refusé", async () => {
    const res = await createTask(alice, { title: '    ' });
    expect(res.status).toBe(400);
  });

  test('le HTML et les scripts sont retirés du titre et de la description (anti XSS stocké)', async () => {
    const res = await createTask(alice, {
      title: '<b>Acheter</b> du pain <script>alert("test")</script>',
      description: '<img src=x onerror=alert(1)>Sans gluten',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Acheter du pain');
    expect(res.body.description).toBe('Sans gluten');
  });

  test('un titre qui ne contient que du script est refusé', async () => {
    const res = await createTask(alice, { title: '<script>alert(1)</script>' });
    expect(res.status).toBe(400);
  });

  test('le champ user envoyé par le client est ignoré (affectation de masse)', async () => {
    const bobProfile = await request(app).get('/api/auth/me').set('Cookie', bob);
    const res = await createTask(alice, { title: 'Test', user: bobProfile.body.user.id });
    expect(res.status).toBe(201);
    const listeBob = await request(app).get('/api/tasks').set('Cookie', bob);
    expect(listeBob.body).toHaveLength(0);
  });

  test('chaque utilisateur ne voit que ses tâches', async () => {
    await createTask(alice, { title: 'Tâche alice' });
    await createTask(bob, { title: 'Tâche bob' });
    const res = await request(app).get('/api/tasks').set('Cookie', alice);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Tâche alice');
  });

  test('PUT bascule isCompleted et met à jour le titre', async () => {
    const created = await createTask(alice, { title: 'Initial' });
    const res = await request(app)
      .put(`/api/tasks/${created.body._id}`)
      .set('Cookie', alice)
      .send({ isCompleted: true, title: 'Modifié' });
    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
    expect(res.body.title).toBe('Modifié');
  });

  test('PUT sans aucun champ renvoie 400', async () => {
    const created = await createTask(alice, { title: 'Initial' });
    const res = await request(app)
      .put(`/api/tasks/${created.body._id}`)
      .set('Cookie', alice)
      .send({});
    expect(res.status).toBe(400);
  });

  test("IDOR : bob ne peut ni modifier ni supprimer la tâche d'alice (403)", async () => {
    const created = await createTask(alice, { title: 'Privée' });
    const id = created.body._id;

    const put = await request(app)
      .put(`/api/tasks/${id}`)
      .set('Cookie', bob)
      .send({ title: 'Piratée' });
    expect(put.status).toBe(403);

    const del = await request(app).delete(`/api/tasks/${id}`).set('Cookie', bob);
    expect(del.status).toBe(403);

    const liste = await request(app).get('/api/tasks').set('Cookie', alice);
    expect(liste.body).toHaveLength(1);
    expect(liste.body[0].title).toBe('Privée');
  });

  test('DELETE supprime sa propre tâche', async () => {
    const created = await createTask(alice, { title: 'À supprimer' });
    const res = await request(app).delete(`/api/tasks/${created.body._id}`).set('Cookie', alice);
    expect(res.status).toBe(200);
    const liste = await request(app).get('/api/tasks').set('Cookie', alice);
    expect(liste.body).toHaveLength(0);
  });

  test('un identifiant mal formé renvoie 400 (et non 500)', async () => {
    const res = await request(app).delete('/api/tasks/abc').set('Cookie', alice);
    expect(res.status).toBe(400);
  });

  test('une tâche inexistante renvoie 404', async () => {
    const res = await request(app)
      .delete('/api/tasks/64b64c1f2f9b9a0012345678')
      .set('Cookie', alice);
    expect(res.status).toBe(404);
  });
});
