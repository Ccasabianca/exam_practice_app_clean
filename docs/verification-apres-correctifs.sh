#!/usr/bin/env bash
# Rejoue le scénario de reproduction sur l'API CORRIGÉE (cookies HttpOnly via un cookie jar).
# Les noms d'utilisateur sont suffixés par un horodatage pour pouvoir relancer le script.
U=$(date +%s); BASE=http://localhost:5000/api; J='Content-Type: application/json'
A=$(mktemp); B=$(mktemp)
echo "### 1. Inscription faible 'a' / '1'"
curl -s -X POST "$BASE/auth/register" -H "$J" -d '{"username":"a","password":"1"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 2. Injection NoSQL au login"
curl -s -X POST "$BASE/auth/login" -H "$J" -d '{"username":{"$gt":""},"password":"motdepasse123"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 3. Inscription alice_$U et bob_$U (jeton dans un cookie HttpOnly, absent du corps)"
curl -s -c "$A" -D - -X POST "$BASE/auth/register" -H "$J" -d "{\"username\":\"alice_$U\",\"password\":\"motdepasse123\"}" | grep -i -E "^HTTP|set-cookie|^\{"
curl -s -c "$B" -X POST "$BASE/auth/register" -H "$J" -d "{\"username\":\"bob_$U\",\"password\":\"motdepasse123\"}" -o /dev/null
echo; echo "### 4. Jeton invalide sur une route protégée"
curl -s "$BASE/tasks" -H "Cookie: token=faux.jeton.invalide" -w "\nHTTP %{http_code}\n"
echo; echo "### 5. Tâche sans titre"
curl -s -b "$A" -X POST "$BASE/tasks" -H "$J" -d '{}' -w "\nHTTP %{http_code}\n"
echo; echo "### 6. Titre et description avec HTML/JS"
curl -s -b "$A" -X POST "$BASE/tasks" -H "$J" -d '{"title":"<b>Acheter</b> du pain <script>alert(\"test\")</script>","description":"<img src=x onerror=alert(1)>Sans gluten"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 7. alice crée une tâche privée, bob tente de la modifier puis de la supprimer"
TASK_ID=$(curl -s -b "$A" -X POST "$BASE/tasks" -H "$J" -d '{"title":"Tache privee d alice"}' | sed -E 's/.*"_id":"([^"]+)".*/\1/')
curl -s -b "$B" -X PUT "$BASE/tasks/$TASK_ID" -H "$J" -d '{"title":"Modifiee par bob"}' -w "\nHTTP %{http_code}\n"
curl -s -b "$B" -X DELETE "$BASE/tasks/$TASK_ID" -w "\nHTTP %{http_code}\n"
echo; echo "### 8. alice coche sa tâche (PUT légitime)"
curl -s -b "$A" -X PUT "$BASE/tasks/$TASK_ID" -H "$J" -d '{"isCompleted":true}' -w "\nHTTP %{http_code}\n"
echo; echo "### 9. Identifiant mal formé, route inexistante"
curl -s -b "$A" -X DELETE "$BASE/tasks/abc" -w "\nHTTP %{http_code}\n"
curl -s "$BASE/inexistante" -w "\nHTTP %{http_code}\n"
echo; echo "### 10. Déconnexion puis sonde de session"
curl -s -b "$A" -c "$A" -X POST "$BASE/auth/logout" -w "\nHTTP %{http_code}\n"
curl -s -b "$A" "$BASE/auth/me" -w "\nHTTP %{http_code}\n"
rm -f "$A" "$B"
