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

// ==========================================================
// Função de mudar e-mail
// A FUNÇÃO AGORA PRECISA DECLARAR AS SECRETS
// ==========================================================

exports.solicitarTrocaEmail = onCall(
  {
    secrets: [emailUser, emailPass],
  },
  async (request) => {

    logger.info("REQUISIÇÃO RECEBIDA:", {
      uid: request.auth?.uid,
      data: request.data,
    });


    // AUTENTICAÇÃO

    if (!request.auth) {
      logger.error("Usuário não autenticado");
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const uid = request.auth.uid;
    let novoEmailRaw = request.data?.novoEmail;


    // VALIDAÇÃO E LIMPEZA

    if (typeof novoEmailRaw !== "string") {
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


    // BUSCAR USUÁRIO ATUAL

    let user;

    try {
      user = await admin.auth().getUser(uid);
      logger.info("Usuário atual:", user.email);
    } catch (err) {
      logger.error("Erro ao buscar usuário:", err);
      throw new HttpsError("internal", "Erro ao localizar usuário.");
    }


    // MESMO E-MAIL

    if (user.email && user.email.toLowerCase() === novoEmail) {
      throw new HttpsError(
        "failed-precondition",
        "O novo e-mail deve ser diferente do atual."
      );
    }


    // VERIFICAR SE E-MAIL JÁ EXISTE (ANTES DO LINK)

    try {
      await admin.auth().getUserByEmail(novoEmail);

      // Se chegou aqui → já existe
      throw new HttpsError(
        "already-exists",
        "Este e-mail já está em uso."
      );
    } catch (err) {

      // Usuário não encontrado → OK
      if (err.code === "auth/user-not-found") {
        logger.info("E-mail ainda não usado no sistema.");
      }
      // Outro erro inesperado
      else if (!(err instanceof HttpsError)) {
        logger.error("Erro inesperado ao verificar duplicidade:", err);
        throw new HttpsError("internal", "Erro ao validar e-mail.");
      }
      // Já lançou HttpsError → continuar jogando
      else {
        throw err;
      }
    }


    // GERAR LINK 
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

      logger.info("LINK GERADO:", link);
    } catch (err) {
      logger.error("Erro ao gerar link:", err);

      // Tratar erro de e-mail já existente especificamente
      if (err.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Este e-mail já está em uso."
        );
      }

      if (err.code === "auth/invalid-email") {
        throw new HttpsError(
          "invalid-argument",
          "E-mail inválido."
        );
      }

      // Outros erros
      throw new HttpsError("internal", "Erro ao gerar link de confirmação.");
    }
    // TRANSPORTER

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser.value(),
        pass: emailPass.value(),
      },
    });

    async function sendEmail({ to, subject, html }) {
      await transporter.sendMail({
        from: `Clínica Dr. Roberto Nigro <${emailUser.value()}>`,
        to,
        subject,
        html,
      });

      logger.info("E-mail enviado:", subject, "->", to);
    }


    // ENVIAR E-MAILS

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
      }

      await sendEmail({
        to: novoEmail,
        subject: "Confirme seu novo e-mail",
        html: `
          <p>Você solicitou alterar seu e-mail.</p>
          <a href="${link}" target="_blank">Confirmar troca de e-mail</a>
        `,
      });

    } catch (err) {
      logger.error("Erro ao enviar e-mail:", err);
      throw new HttpsError("internal", "Erro ao enviar e-mails.");
    }

    return { sucesso: true };
  }
);
