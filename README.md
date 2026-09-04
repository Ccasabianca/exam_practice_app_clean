# Mes Tâches

Petite appli de gestion de tâches (React + Node/Express + MongoDB) reprise pour l'examen
blanc "Mise en production et maintenance applicative". Le code fourni contenait des bugs et
des failles volontaires : je les ai corrigés, mis les dépendances à jour, ajouté des tests et
de l'outillage, puis préparé la mise en production. Le détail est dans [CHANGELOG.md](CHANGELOG.md),
les preuves (transcriptions avant / après) dans `docs/`.

## Stack

- backend : Node 24, Express 5, Mongoose 9, JWT en cookie HttpOnly, Joi, Winston
- frontend : React 19, Vite 8, react-router 7, axios
- base : MongoDB 7 (docker en local, Atlas en ligne)
- tests : Jest + Supertest côté API, Vitest + Testing Library côté front
- qualité : ESLint, Prettier, JSDoc

## Lancer en local

```bash
docker run -d --name todo-mongo -p 27017:27017 -v todo-mongo-data:/data/db mongo:7
cd backend && npm install && cp .env.example .env    # mettre un vrai JWT_SECRET
npm run dev                                          # http://localhost:5000/health
cd ../frontend && npm install && npm run dev         # http://localhost:5173
```

Tout en docker (mongo + API + front nginx sur un seul port) :

```bash
cp .env.example .env    # JWT_SECRET
docker compose up --build   # http://localhost:8080
```

## Variables d'environnement

Backend (voir `backend/.env.example`) :

| Variable | Rôle |
|---|---|
| MONGO_URI | connexion MongoDB |
| JWT_SECRET | 32 caractères minimum, le serveur refuse de démarrer sinon |
| JWT_EXPIRES_IN | durée du jeton, 1h par défaut |
| CORS_ORIGIN | origines autorisées, séparées par des virgules |
| COOKIE_SECURE / COOKIE_SAMESITE | cookie de session, Secure=true en prod |
| TRUST_PROXY | true derrière un reverse proxy |
| LOG_LEVEL | error, warn, info, http, debug |
| RATE_LIMIT_AUTH_MAX | échecs de connexion tolérés par IP sur 15 min |

Frontend : `VITE_API_URL`, l'URL de l'API injectée à la build.

## Tests et qualité

```bash
cd backend && npm test && npm run lint && npm run format:check && npm run docs
cd frontend && npm test && npm run lint && npm run build
```

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id`
- `GET /health` : état de l'API et de la base

Doc générée depuis les commentaires JSDoc : `npm run docs` dans `backend/`, puis `backend/docs/index.html`.

## Pipeline

GitHub Actions (`.github/workflows/ci.yml`) : lint, tests avec MongoDB, build, images Docker
scannées avec Trivy et publiées sur GHCR, puis déploiement de l'environnement de la branche
(develop = préproduction, main = production) et test de fumée sur `/health`.

## Environnements

| Environnement | Branche | Front | API |
|---|---|---|---|
| préproduction | develop | https://preprod.examenblanc.mywatchbuddy.com | https://api-preprod.examenblanc.mywatchbuddy.com/health |
| production | main | https://examenblanc.mywatchbuddy.com | https://api.examenblanc.mywatchbuddy.com/health |

Hébergement Render (Frankfurt, décrit dans `render.yaml`), base MongoDB Atlas (Paris), DNS chez
Hostinger, certificats émis automatiquement par Render.

## Supervision

![Supervision](https://github.com/Ccasabianca/exam_practice_app_clean/actions/workflows/monitoring.yml/badge.svg)

Le workflow `Supervision` interroge les quatre URL toutes les dix minutes : disponibilité, contenu
attendu, temps de réponse, expiration du certificat. Un échec déclenche un email GitHub. Render
surveille en plus `/health` et redémarre le conteneur si besoin.
