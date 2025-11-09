// scripts/make_admin.js
// Uso: node scripts/make_admin.js --uid="<UID_DO_USUARIO>" --role="admin" --key="C:\\caminho\\serviceAccountKey.json"

const admin = require("firebase-admin");

// Parse dos argumentos simples
const args = process.argv.slice(2).reduce((acc, cur) => {
  const [k, v] = cur.split("=");
  if (k && v) acc[k.replace(/^--/, "")] = v.replace(/^"|"$/g, "");
  return acc;
}, {});

const uid = args.uid;
const role = args.role || "admin";
const keyPath = args.key;

if (!uid || !keyPath) {
  console.error("❌ Uso: node scripts/make_admin.js --uid=\"<UID>\" --role=\"admin|doctor|patient\" --key=\"C:\\\\caminho\\\\serviceAccountKey.json\"");
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

(async () => {
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`✅ Custom claim aplicada: uid=${uid}, role=${role}`);
    console.log("⚠️ Faça logout e login novamente no app para o token atualizar.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao definir claims:", err);
    process.exit(1);
  }
})();
