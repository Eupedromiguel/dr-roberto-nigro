// =======================================
// src/services/firebase.js
// =======================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

// 🔹 Configuração correta do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA9lwRqT75rnvasTDZPYYurwjVJf8wQcnI",
  authDomain: "consultorio-app-2156a.web.app",
  projectId: "consultorio-app-2156a",
  storageBucket: "consultorio-app-2156a.firebasestorage.app",
  messagingSenderId: "12007390383",
  appId: "1:12007390383:web:19cc4d5b3763b1a469e85a",
};

// ✅ Inicializa o app
const app = initializeApp(firebaseConfig);

// ✅ Serviços Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");

// 🔹 Importante: garante que o reCAPTCHA funcione no navegador HTTPS
if (typeof window !== "undefined") {
  auth.languageCode = "pt-BR"; // 🧩 SMS em português
}

// ✅ Adicione esta linha:
export const authConfig = firebaseConfig;

// ✅ Export default
export default app;
