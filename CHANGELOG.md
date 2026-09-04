# Changelog

Appli "Mes Tâches", examen blanc "Mise en production et maintenance applicative".
Ce fichier liste ce que j'ai trouvé et ce que j'ai corrigé (E27 / E28 / E29). Le détail est
dans le code (commentaires "fix :") et dans docs/. Le code d'origine est dans le premier
commit git.

## À venir

Hébergement Render (préprod + prod), DNS + HTTPS, supervision et alertes.

## 1.1.0 - 2026-09-04

### Ce que j'ai constaté au départ

J'ai rejoué le scénario avec curl sur l'API d'origine (script et sortie dans
docs/reproduction-avant-correctifs.*) :

- cors ouvert à tout le monde, X-Powered-By visible, aucun en-tête de sécurité
- inscription "a" / "1" acceptée
- connexion possible avec {"$gt": ""} à la place du login : injection NoSQL, on rentre sans
  connaître le compte
- jeton invalide : 418 (I'm a teapot) au lieu de 401
- tâche sans titre : 500 au lieu de 400
- `<script>` stocké tel quel dans un titre
- bob peut modifier et supprimer la tâche d'alice (IDOR)
- id mal formé : 500, route inconnue : page html
- des console.log partout, rien d'exploitable
- côté front : la liste ne se met pas à jour après un ajout, aucun message d'erreur, /tasks
  accessible sans être connecté, header en double qui recouvre le contenu

### Sécurité (E28)

- IDOR : je vérifie que la tâche appartient à l'utilisateur avant PUT / DELETE, 403 sinon et la
  tentative est journalisée (routes/tasks.js)
- validation : Joi sur toutes les entrées, types stricts, longueurs bornées, champs inconnus
  supprimés. Un objet à la place d'une chaîne est refusé, ce qui règle l'injection NoSQL
  (validators/schemas.js, middleware/validate.js)
- XSS : je retire le html des titres et descriptions avec la lib xss, React échappe le rendu,
  helmet pose une CSP (utils/sanitize.js)
- secret JWT : j'ai remplacé secretkey123 par un secret aléatoire de 64 hexa, .env hors git,
  .env.example fourni, le serveur refuse de démarrer si le secret fait moins de 32 caractères
  (config/env.js)
- CORS : liste blanche via CORS_ORIGIN, credentials activés (app.js)
- jeton : plus dans localStorage. Cookie HttpOnly, Secure en prod, SameSite. J'ai ajouté
  /auth/logout et /auth/me pour fermer et restaurer la session côté front (utils/token.js,
  middleware/auth.js)
- mots de passe : 8 caractères mini, login 3 à 30 caractères sûrs, bcrypt à 12 tours, hachage
  dans un hook du modèle, mot de passe jamais renvoyé (models/User.js)
- force brute : 20 échecs par IP et 15 min sur login / register, 300 requêtes par IP sur /api
  (middleware/rateLimiters.js)
- énumération : même message et même temps de réponse pour compte inconnu et mauvais mot de
  passe (routes/auth.js)
- helmet, X-Powered-By masqué, body limité à 10 ko
- dépendances : tout en dernière version, 0 vulnérabilité npm audit des deux côtés (61 avant
  côté front)

### Bugs (E27)

- la liste se met à jour tout de suite après ajout / modif / suppression (addTask était vide)
- formulaire vide : 400 avec message côté API, bloqué côté front avec un message
- j'affiche les messages d'erreur (login, inscription, ajout, chargement) au lieu de
  console.error
- 401 au lieu de 418, 400 au lieu de 500 sur id invalide et validation, 404 en json
- express 5 : les erreurs async remontent au handler central, plus de crash silencieux
- routes protégées côté routeur, redirection vers la connexion sans session, page 404
- on peut cocher et modifier une tâche (la route PUT existait, pas l'interface)
- déconnexion propre (appel API puis redirection), connexion directe après inscription
- interface : un seul header, un seul css, plus de barre horizontale. J'ai gardé les couleurs,
  le footer et les libellés d'origine, passé les pages login / register en français comme le
  reste, et l'année du footer est calculée
- au passage : lang="fr", 201 à la création, 409 sur doublon, findByIdAndRemove remplacé
  (supprimé de mongoose 8), jwt.sign passé en synchrone

### Dépendances

- backend : express 4 -> 5, mongoose 7 -> 9, bcryptjs 2 -> 3, dotenv 16 -> 17, jsonwebtoken et
  cors à jour. Ajout de helmet, express-rate-limit, joi, xss, winston, cookie-parser
- frontend : j'ai remplacé CRA (react-scripts 5, abandonné, 61 vulnérabilités) par Vite 8.
  React 19, react-router 7, axios 1.20
- outillage : jest + supertest, vitest + testing library, eslint, prettier, jsdoc

### Outillage et logs (E24 / E25)

- config centralisée et validée au démarrage (config/env.js)
- winston : json en prod, lisible en dev. Chaque requête est journalisée avec ip et
  utilisateur, les événements de sécurité aussi (login raté, accès refusé, rate limit, cors
  bloqué)
- GET /health : état de la base, 503 si mongo est down. Sert à docker et à la supervision
- arrêt propre sur SIGTERM
- tests : 36 tests d'intégration backend (jest + supertest sur une base todo_test), 5 tests
  front (vitest)
- eslint + prettier partout, doc générée avec npm run docs
- Dockerfiles backend et frontend, docker compose avec MongoDB, pipeline GitHub Actions

### Doc (E29)

- commentaires "fix :" là où j'ai corrigé quelque chose, jsdoc court sur les routes,
  middlewares et modèles
- ce changelog, README réécrit
- rejeu du scénario d'attaque sur l'API corrigée : docs/verification-apres-correctifs.txt

## 1.0.0 - état d'origine

Version fournie par Cloud Campus, avec bugs et failles volontaires (premier commit).
