# Réponses au formulaire, session hébergement (E21 à E26)

Brouillon à relire et à compléter avec les URL et les captures. Les [crochets] sont à remplacer.

## E21. Choix de l'hébergement et environnement de qualification

J'ai comparé quatre pistes : Render, Scaleway (serverless containers), GCP Cloud Run et AWS
(App Runner + Amplify), plus mon hébergement LAMP Hostinger que je connais bien. Le LAMP
mutualisé ne convient pas : l'API Node doit tourner en permanence, il n'y a pas de processus
persistant chez un hébergeur PHP. Mes critères : gratuit sans carte bancaire, conteneurs
Docker, HTTPS automatique, domaine personnalisé, deux environnements séparés, logs et
métriques intégrés, région UE, temps de mise en place compatible avec l'examen.

Render coche tout : PaaS de la famille Heroku, conteneurs sur infra gérée, répartiteur de
charge, TLS Let's Encrypt automatique, health checks avec redémarrage, déploiements sans
coupure, retour arrière, logs, région Frankfurt. GCP et AWS demandent un compte de
facturation et une heure de mise en place en plus ; Scaleway impose une vérification
d'identité. Limites du plan gratuit Render à connaître : mise en veille après 15 minutes
sans trafic (réveil en une minute environ), 750 heures d'instance par mois, pas de disque
persistant. Une instance Starter à 7 dollars par mois lève la mise en veille.

La base est sur MongoDB Atlas M0 (gratuit, Frankfurt), avec une base et un utilisateur
distincts par environnement. Les images Docker sont construites par le pipeline et publiées
sur le registre GitHub (GHCR).

Environnement de qualification (préproduction) : branche develop, API
https://api-preprod.examenblanc.mywatchbuddy.com, front https://preprod.examenblanc.mywatchbuddy.com,
base todo_preprod. Tout est décrit dans render.yaml (infrastructure as code, appliqué via
un Blueprint Render).

Captures : tableau comparatif, dashboard Render avec les quatre services, cluster Atlas,
render.yaml, page de préprod en ligne.

## E22. Mise en œuvre sécurisée de la production et administration

Production : branche main, API https://api.examenblanc.mywatchbuddy.com, front
https://examenblanc.mywatchbuddy.com, base todo_prod.

Mesures :
- secrets uniquement dans les variables d'environnement Render, jamais dans le dépôt
  (.env ignoré par git, .env.example fourni) ; JWT_SECRET distinct par environnement et
  généré par Render ; le serveur refuse de démarrer si le secret fait moins de 32 caractères
- utilisateurs Atlas limités en droits à leur base ; allowlist réseau restreinte aux IP
  sortantes de Render [à confirmer après remplacement du 0.0.0.0/0 provisoire]
- HTTPS forcé par Render, cookie de session HttpOnly + Secure, helmet (CSP, HSTS...),
  CORS en liste blanche, limitation de débit, validation Joi de toutes les entrées
- conteneur non-root, image minimale, scan Trivy dans le pipeline, Dependabot hebdomadaire
- la production ne se déploie que depuis main, par le pipeline, si lint, tests et scan
  passent ; auto-deploy Render désactivé, déploiement déclenché par hook avec l'image du
  commit exact
- health check /health surveillé par Render (redémarrage automatique), retour arrière en un
  clic sur le déploiement précédent
- double authentification activée sur GitHub, Render et Atlas [à confirmer]
- administration : dashboard Render (logs, métriques, variables, rollback), Atlas (Data
  Explorer, métriques), sauvegarde manuelle par mongodump documentée car M0 n'a pas de
  sauvegarde automatique

Captures : variables d'environnement Render (valeurs masquées), utilisateurs et allowlist
Atlas, page de prod en ligne, un déploiement Render avec son commit.

## E23. Nom de domaine, DNS, certificats

Je réutilise mon domaine mywatchbuddy.com (Hostinger, DNS chez dns-parking.com) avec un
sous-domaine dédié à l'exercice, examenblanc.mywatchbuddy.com. Quatre enregistrements CNAME
dans la zone DNS Hostinger pointent vers les services Render :

| Nom | Environnement | Cible |
|---|---|---|
| examenblanc | front prod | [examenblanc-front.onrender.com] |
| api.examenblanc | API prod | [examenblanc-api.onrender.com] |
| preprod.examenblanc | front préprod | [examenblanc-front-preprod.onrender.com] |
| api-preprod.examenblanc | API préprod | [examenblanc-api-preprod.onrender.com] |

Render vérifie chaque domaine puis émet un certificat Let's Encrypt, renouvelé
automatiquement. Vérifications : cadenas et détail du certificat dans le navigateur, `curl -vI`
sur les quatre noms, rapport SSL Labs [note obtenue]. Front et API partagent le même domaine
racine, donc le cookie de session fonctionne sans réglage cross-site.

Captures : zone DNS Hostinger, page Custom Domains de Render avec les certificats émis,
cadenas sur préprod et prod, rapport SSL Labs.

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

Captures : run vert avec les quatre jobs, packages GHCR, onglet Environments de GitHub avec
les déploiements, un déploiement Render déclenché par le pipeline.

## E25. Journalisation et audit

Winston remplace les console.log : logs JSON en production, lisibles en développement,
niveau piloté par LOG_LEVEL. Chaque requête est journalisée (méthode, URL, statut, durée, IP
réelle derrière le proxy, utilisateur), ainsi que les événements de sécurité : connexion
réussie ou échouée avec IP, accès refusé à la tâche d'un autre utilisateur, dépassement de
débit, origine CORS refusée, jeton rejeté. Les logs sont consultables dans Render pour les
deux environnements [et centralisés dans Better Stack Logs si mis en place].

Audit : npm audit et scan Trivy à chaque exécution du pipeline, Dependabot hebdomadaire,
journal des déploiements Render (qui, quoi, quand), Activity Feed Atlas.

Captures : logs JSON d'une connexion et d'un accès refusé dans Render, rapport Trivy dans
un run, page Dependabot.

## E26. Supervision et alertes

Better Stack Uptime (gratuit) : quatre moniteurs HTTP toutes les 3 minutes sur /health des
deux API (vérification du mot-clé "ok") et sur les deux fronts, alerte email si deux
contrôles consécutifs échouent, alerte si le temps de réponse dépasse 2 secondes, alerte si
le certificat expire dans moins de 7 jours, page de statut publique [URL]. Render surveille
en plus /health et redémarre le conteneur, et notifie par email les échecs de déploiement.

Test réel : suspension du service de préprod pendant quelques minutes, réception de
l'alerte, reprise et clôture de l'incident.

Captures : liste des moniteurs, détail d'un moniteur, email d'alerte reçu, page de statut.

## Accès à transmettre aux correcteurs

- dépôt : https://github.com/Ccasabianca/exam_practice_app_clean
- préprod : https://preprod.examenblanc.mywatchbuddy.com et https://api-preprod.examenblanc.mywatchbuddy.com/health
- prod : https://examenblanc.mywatchbuddy.com et https://api.examenblanc.mywatchbuddy.com/health
- compte de test sur chaque environnement : [identifiant] / [mot de passe]
- invitations Render, Atlas et Better Stack en lecture : [à envoyer]
