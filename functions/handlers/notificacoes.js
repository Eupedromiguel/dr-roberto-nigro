// handlers/notificacoes.js

const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params"); 
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Inicializa o Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}

// DEFINA AS SECRETS CORRETAMENTE
const emailUser = defineSecret("EMAIL_USER");
const emailPass = defineSecret("EMAIL_PASS");

// A FUNÇÃO AGORA PRECISA DECLARAR AS SECRETS
exports.solicitarTrocaEmail = onCall(
  {
    secrets: [emailUser, emailPass], 
  },
  async (request) => {
    logger.info("REQUISIÇÃO RECEBIDA:", {
      uid: request.auth?.uid,
      data: request.data,
    });

    if (!request.auth) {
      logger.error("Usuário não autenticado");
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const uid = request.auth.uid;
    let novoEmailRaw = request.data?.novoEmail;

    if (typeof novoEmailRaw !== "string") {
      logger.error("Tipo inválido de email recebido:", {
        recebido: novoEmailRaw,
        tipo: typeof novoEmailRaw,
      });
      throw new HttpsError("invalid-argument", "E-mail inválido.");
    }

    const novoEmail = novoEmailRaw
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, "")
      .normalize("NFKC")
      .trim()
      .toLowerCase();

    logger.info("EMAIL LIMPO:", novoEmail);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(novoEmail)) {
      throw new HttpsError("invalid-argument", "Formato de e-mail inválido.");
    }

    let user;

    try {
      user = await admin.auth().getUser(uid);
      logger.info("Usuário carregado:", user.email);
    } catch (err) {
      logger.error("Erro ao buscar usuário:", err);
      throw new HttpsError("internal", "Erro ao localizar usuário.");
    }

    if (user.email === novoEmail) {
      throw new HttpsError(
        "failed-precondition",
        "O novo e-mail deve ser diferente do atual."
      );
    }

    let link;

    try {
      link = await admin.auth().generateVerifyAndChangeEmailLink(
        user.email,
        novoEmail,
        {
          url: "https://consultorio-app-2156a.web.app/auth/action",
          handleCodeInApp: true,
        }
      );

      logger.info("Link gerado com sucesso:", link);
    } catch (err) {
      logger.error("Erro ao gerar link:", err);

      if (err.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Este e-mail já está em uso.");
      }

      throw new HttpsError("internal", "Erro ao gerar link de confirmação.");
    }

    // CRIE O TRANSPORTER DENTRO DA FUNÇÃO USANDO AS SECRETS
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser.value(), 
        pass: emailPass.value(), 
      },
    });

    // FUNÇÃO DE ENVIO LOCAL
    async function sendEmail({ to, subject, html }) {
      try {
        await transporter.sendMail({
          from: `Clínica Dr. Roberto Nigro <${emailUser.value()}>`,
          to,
          subject,
          html,
        });
        logger.info(`E-mail enviado para ${to}: ${subject}`);
      } catch (err) {
        logger.error("Erro ao enviar e-mail:", err);
        throw err; 
      }
    }

    try {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "Aviso de segurança",
          html: `
            <p>Uma solicitação de troca de e-mail foi feita.</p>
            <p><b>Novo e-mail:</b> ${novoEmail}</p>
          `,
        });

        logger.info("Aviso enviado para e-mail antigo");
      }

      await sendEmail({
        to: novoEmail,
        subject: "Confirme seu novo e-mail",
        html: `
          <p>Você solicitou alterar seu e-mail.</p>
          <a href="${link}" target="_blank">Confirmar troca de e-mail</a>
        `,
      });

      logger.info("Confirmação enviada ao novo e-mail");
    } catch (err) {
      logger.error("Erro ao enviar e-mail:", err);
      throw new HttpsError("internal", "Erro ao enviar e-mails.");
    }

    return { sucesso: true };
  }
);