// MODELOS DE E-MAIL's
const { logger } = require("firebase-functions"); // usa logger da v2
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Inicializa o Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}
const auth = admin.auth();

// ======================================================
// Lê variáveis de ambiente
// ======================================================
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  logger.warn(
    "⚠️ Variáveis de e-mail ausentes. Configure-as com: firebase functions:secrets:set EMAIL_USER EMAIL_PASS"
  );
}

// ======================================================
// Configuração do transporte (Gmail + App Password)
// ======================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER || "placeholder@email.com",
    pass: EMAIL_PASS || "placeholder-pass",
  },
});

// ======================================================
// Função genérica de envio de e-mail
// ======================================================
async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `Clínica Dr. Roberto Nigro <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`📨 E-mail enviado para ${to}: ${subject}`);
  } catch (err) {
    logger.error("❌ Erro ao enviar e-mail:", err);
  }
}

// ======================================================
// 1. Verificação de E-mail (usado em onUserCreated)
// ======================================================
exports.sendVerificationEmail = async (user) => {
  if (!user.email) return;

  const link = await auth.generateEmailVerificationLink(user.email, {
    url: "https://consultorio-app-2156a.web.app/auth/action",
    handleCodeInApp: true,
  });

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifique seu e-mail</title>
  <style>
    body { margin:0; padding:0; background-color:#f5f7fa; font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; color:#333; }
    .container { max-width:520px; margin:40px auto; background:#fff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden; }
    .header { background:linear-gradient(135deg,#1c2636,#222d3f); padding:24px; text-align:center; color:#fff; }
    .header h1 { font-size:20px; margin:0; font-weight:600; }
    .content { padding:32px 28px; text-align:center; }
    .content p { font-size:15px; line-height:1.6; margin:12px 0; }
    .button { display:inline-block; margin:28px 0; padding:14px 28px; background-color:#030712; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; }
    .button:hover { background-color:#facc15; color:#030712; }
    .footer { padding:16px; text-align:center; font-size:13px; color:#777; background-color:#f9fafb; border-top:1px solid #e5e7eb; }
    @media (max-width:480px){ .container{margin:20px;} }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Clínica Dr. Roberto Nigro</h1>
    </div>
    <div class="content">
      <p>Olá ${user.displayName || "usuário"},</p>
      <p>
        Seja bem-vindo(a) à <b>Clínica Dr. Roberto Nigro</b>!<br/>
        Antes de continuar, precisamos confirmar que este e-mail pertence a você.
      </p>
      <a href="${link}" class="button">Verificar meu e-mail</a>
      <p>Caso o botão não funcione, copie e cole o link abaixo no seu navegador:</p>
      <p style="font-size:13px; color:#555; word-break:break-all;">${link}</p>
    </div>
    <div class="footer">
      <p>
        Esta é uma mensagem automática. Não é necessário respondê-la.<br/>
        © 2025 Clínica Dr. Roberto Nigro — Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: user.email,
    subject: "Verifique seu e-mail — Clínica Dr. Roberto Nigro",
    html,
  });
};

// ======================================================
// 2. Redefinição de Senha
// ======================================================
exports.sendPasswordResetEmail = async (email) => {
  const link = await auth.generatePasswordResetLink(email, {
    url: "https://consultorio-app-2156a.web.app/auth/action",
    handleCodeInApp: true,
  });

  const html = `
    <h2>Redefinição de Senha</h2>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <a href="${link}" target="_blank">Redefinir senha</a>
  `;

  await sendEmail({
    to: email,
    subject: "Redefinição de senha - Clínica Dr. Roberto Nigro",
    html,
  });
};

// ======================================================
// 3. Alteração de E-mail
// ======================================================
exports.sendChangeEmail = async (uid, novoEmail) => {
  const user = await auth.getUser(uid);
  const antigoEmail = user.email;

  const verifyLink = await auth.generateVerifyAndChangeEmailLink(novoEmail, {
    url: "https://consultorio-app-2156a.web.app/auth/action",
    handleCodeInApp: true,
  });

  // E-mail de aviso para o antigo
  if (antigoEmail) {
    await sendEmail({
      to: antigoEmail,
      subject: "Aviso: alteração de e-mail detectada",
      html: `<p>Seu e-mail foi alterado para <b>${novoEmail}</b>.</p>`,
    });
  }

  // E-mail de confirmação para o novo
  await sendEmail({
    to: novoEmail,
    subject: "Confirme seu novo e-mail - Clínica Dr. Roberto Nigro",
    html: `<p>Confirme seu novo e-mail clicando abaixo:</p>
           <a href="${verifyLink}" target="_blank">Confirmar novo e-mail</a>`,
  });
};

// ======================================================
// 4. Aviso de Alteração de Senha
// ======================================================
exports.sendPasswordChangedAlert = async (email) => {
  await sendEmail({
    to: email,
    subject: "Aviso: sua senha foi alterada",
    html: `<p>Olá, sua senha foi alterada com sucesso.</p>`,
  });
};

// ======================================================
// 5. Aviso de Alteração de Telefone
// ======================================================
exports.sendPhoneChangedAlert = async (email, novoTelefone) => {
  await sendEmail({
    to: email,
    subject: "Aviso: seu telefone foi alterado",
    html: `<p>Seu novo número de telefone é <b>${novoTelefone}</b>.</p>`,
  });
};
