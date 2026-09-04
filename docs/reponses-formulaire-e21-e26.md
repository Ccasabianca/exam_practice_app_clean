# Réponses au formulaire, session hébergement (E21 à E26)

Brouillon à relire et à compléter avec les captures. Les [crochets] restent à remplacer.

## E21. Choix de l'hébergement et environnement de qualification

J'ai comparé quatre pistes : Render, Scaleway (serverless containers), GCP Cloud Run et AWS
(App Runner + Amplify), plus mon hébergement LAMP Hostinger que je connais bien. Le LAMP
mutualisé ne convient pas : l'API Node doit tourner en permanence, il n'y a pas de processus
persistant chez un hébergeur PHP. Mes critères : gratuit sans carte bancaire, conteneurs
Docker, HTTPS automatique, domaine personnalisé, deux environnements séparés, logs et
métriques intégrés, région UE, temps de mise en place compatible avec l'examen.

Render coche tout : PaaS de la famille Heroku, conteneurs sur infra gérée, répartiteur de
charge, TLS automatique, health checks avec redémarrage, déploiements sans coupure, retour
arrière, logs, région Frankfurt. GCP et AWS demandent un compte de facturation et une heure de
mise en place en plus ; Scaleway impose une vérification d'identité. Limites du plan gratuit
Render à connaître : mise en veille après 15 minutes sans trafic (réveil en une minute
environ), 750 heures d'instance par mois, pas de disque persistant. Une instance Starter à
7 dollars par mois lève la mise en veille.

La base est sur MongoDB Atlas M0 (gratuit, Paris), avec une base par environnement
(todo_preprod et todo_prod). Les images Docker sont construites par le pipeline et publiées
sur le registre GitHub (GHCR).

Environnement de qualification (préproduction) : branche develop, front https://preprod.examenblanc.mywatchbuddy.com (l'API est servie sous le même nom via /api),
base todo_preprod. Tout est décrit dans render.yaml (infrastructure as code, appliqué via un
Blueprint Render).

Captures : tableau comparatif, dashboard Render avec les quatre services, cluster Atlas,
render.yaml, page de préprod en ligne.

## E22. Mise en œuvre sécurisée de la production et administration

Production : branche main, front https://examenblanc.mywatchbuddy.com (API sous le même nom via /api),
base todo_prod.

Mesures :
- secrets uniquement dans les variables d'environnement Render, jamais dans le dépôt
  (.env ignoré par git, .env.example fourni) ; JWT_SECRET distinct par environnement et
  généré par Render ; le serveur refuse de démarrer si le secret fait moins de 32 caractères
- une base Atlas par environnement ; allowlist réseau [0.0.0.0/0 provisoire, à remplacer par
  les IP sortantes de Render] ; un utilisateur readWrite par base reste à créer à la place du
  compte admin unique
- HTTPS forcé par Render, cookie de session HttpOnly + Secure, helmet (CSP, HSTS...),
  CORS en liste blanche, limitation de débit, validation Joi de toutes les entrées
- conteneur non-root, image minimale, scan Trivy dans le pipeline, Dependabot hebdomadaire
- la production ne se déploie que depuis main, par le pipeline, si lint, tests et scan
  passent ; auto-deploy Render désactivé, déploiement déclenché par hook avec l'image du
  commit exact
- health check /health surveillé par Render (redémarrage automatique), retour arrière en un
  clic sur le déploiement précédent
- administration : dashboard Render (logs, métriques, variables, rollback), Atlas (Data
  Explorer, métriques), sauvegarde manuelle par mongodump documentée car M0 n'a pas de
  sauvegarde automatique
- double authentification sur GitHub, Render et Atlas [à confirmer]

Captures : variables d'environnement Render (valeurs masquées), allowlist Atlas, page de
prod en ligne, un déploiement Render avec son commit.

## E23. Nom de domaine, DNS, certificats

Je réutilise mon domaine mywatchbuddy.com (Hostinger, DNS chez dns-parking.com) avec un
sous-domaine dédié à l'exercice, examenblanc.mywatchbuddy.com. Sans moyen de paiement, Render
limite le compte à deux domaines personnalisés : je les ai donnés aux deux fronts, et chaque
front relaie /api et /health vers son API par une règle de réécriture (proxy), comme le fait
nginx dans mon docker compose. Résultat : une seule origine par environnement, pas de CORS
entre front et API, cookie de session plus simple. Les API restent joignables en HTTPS sur leur
adresse onrender.com.

| Nom | Environnement | Type | Cible |
|---|---|---|---|
| examenblanc | production | CNAME | examenblanc-front.onrender.com |
| preprod.examenblanc | préproduction | CNAME | examenblanc-front-preprod.onrender.com |

L'ALIAS posé par Hostinger sur examenblanc a été supprimé, un CNAME ne pouvant pas cohabiter
avec un autre enregistrement du même nom. TTL 300. Render vérifie le domaine puis émet et
renouvelle le certificat automatiquement (autorité Google Trust Services). Vérifications :
cadenas et détail du certificat dans le navigateur, curl -vI et openssl s_client sur les
deux noms, rapport SSL Labs [note]. Deux enregistrements api.examenblanc et
api-preprod.examenblanc avaient été créés avant de connaître la limite ; ils sont inutilisés.

Captures : zone DNS Hostinger, Custom Domains de Render avec les certificats émis, cadenas sur
préprod et prod, rapport SSL Labs.

## E24. Déploiement automatisé (CI/CD)

Pipeline GitHub Actions (.github/workflows/ci.yml), déclenché sur push et pull request vers
develop et main :

1. backend : npm ci, lint, prettier, 36 tests d'intégration avec MongoDB en service
   container, audit des dépendances
2. frontend : npm ci, lint, prettier, 5 tests, build, audit
3. images : construction des deux images Docker, analyse Trivy (rapport HIGH et CRITICAL,
   blocage sur CRITICAL corrigeable), publication sur GHCR avec les tags branche et sha
4. déploiement : hook Render de l'environnement de la branche (develop = préprod, main =
   prod) avec l'image du commit, puis test de fumée sur /health

Conteneurisation : Dockerfile backend (multi-stage, non-root, healthcheck), Dockerfile
frontend (build Vite puis nginx), docker-compose.yml pour une préprod locale complète avec
MongoDB. Dependabot ouvre les mises à jour de dépendances en pull request, vérifiées par le
même pipeline.

Incidents rencontrés et corrigés pendant la mise en place, à raconter : tag de l'action Trivy
(passage au préfixe v), panne ponctuelle du service npm audit (l'étape ne bloque plus sur une
indisponibilité du service), image demandée avec le sha complet alors qu'elle était taguée
avec le sha court.

Captures : run vert avec les quatre jobs, packages GHCR, onglet Environments de GitHub avec
les déploiements, un déploiement Render déclenché par le pipeline.

## E25. Journalisation et audit

Winston remplace les console.log : logs JSON en production, lisibles en développement,
niveau piloté par LOG_LEVEL. Chaque requête est journalisée (méthode, URL, statut, durée, IP
réelle derrière le proxy, utilisateur), ainsi que les événements de sécurité : connexion
réussie ou échouée avec IP, accès refusé à la tâche d'un autre utilisateur, dépassement de
débit, origine CORS refusée, jeton rejeté. Les logs sont consultables dans Render pour les
deux environnements ; c'est d'ailleurs le log JSON "Could not connect to any servers in your
MongoDB Atlas cluster" qui m'a permis de diagnostiquer l'allowlist manquante au premier
déploiement.

Audit : npm audit et scan Trivy à chaque exécution du pipeline, Dependabot hebdomadaire,
journal des déploiements Render (qui, quoi, quand), Activity Feed Atlas.

Captures : logs JSON dans Render (connexion, accès refusé, erreur Atlas du premier
déploiement), rapport Trivy dans un run, page Dependabot.

## E26. Supervision et alertes

Sonde externe : workflow GitHub Actions `Supervision` (.github/workflows/monitoring.yml),
planifié toutes les dix minutes et lançable à la main. Pour chacune des quatre URL (santé de l'API via
/health du domaine, page du front, préprod et prod) : disponibilité (code 200), contenu attendu
(`"status":"ok"` sur /health, titre de la page sur le front), temps de réponse (avertissement au-dessus de 2 s),
expiration du certificat (échec si moins de 14 jours). Un échec envoie un email GitHub,
et le badge du README passe au rouge. Effet utile : les pings empêchent la mise en veille
des services gratuits Render.

Côté plateforme : Render surveille /health et redémarre le conteneur, notifie par email les
échecs de déploiement, et expose les métriques CPU, mémoire et requêtes de chaque service.

Test d'incident : suspension du service de préprod, lancement manuel du workflow, échec de la
sonde "API préproduction" et email reçu, reprise du service, sonde de nouveau verte.

Captures : run du workflow Supervision avec les quatre sondes, run en échec pendant le test
d'incident, email d'alerte, badge du README, métriques Render.

## Accès à transmettre aux correcteurs

- dépôt : https://github.com/Ccasabianca/exam_practice_app_clean
- préprod : https://preprod.examenblanc.mywatchbuddy.com (API : /api, santé : /health)
- prod : https://examenblanc.mywatchbuddy.com (API : /api, santé : /health)
- compte de test sur chaque environnement : [identifiant] / [mot de passe]
- invitations Render et Atlas en lecture : [à envoyer]
