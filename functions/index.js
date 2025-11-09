const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");

// ✅ setGlobalOptions: chame UMA única vez no projeto
setGlobalOptions({
  region: "southamerica-east1",
  // opcional:
  // memory: "256MiB",
  // maxInstances: 10,
});

// ✅ Admin SDK só uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}

// Handlers (cada um usa v2/onCall internamente)
const usuarios = require("./handlers/usuarios");
const consultas = require("./handlers/consultas");
const medicos   = require("./handlers/medicos");
const adminMod  = require("./handlers/adminFunctions");
const notificacoes  = require("./handlers/notificacoes");

// Namespaces (ponto)
exports.usuarios  = usuarios;
exports.consultas = consultas;
exports.medicos   = medicos;
exports.admin     = adminMod;

// 🔎 Função de saúde mínima para validar carregamento
exports.health = {
  ping: onCall(async () => ({ ok: true, ts: Date.now() })),
};
