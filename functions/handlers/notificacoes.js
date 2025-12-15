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
          subject: "Aviso de Segurança - Solicitação de Alteração de E-mail",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Aviso de Segurança</h1>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                            Olá,
                          </p>

                          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                              <strong>Atenção:</strong> Uma solicitação de alteração de e-mail foi realizada em sua conta.
                            </p>
                          </div>

                          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Detalhes da Solicitação
                            </p>
                            <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                              <strong>E-mail atual:</strong> ${user.email}
                            </p>
                            <p style="margin: 8px 0 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                              <strong>Novo e-mail solicitado:</strong> <span style="color: #059669; font-weight: 600;">${novoEmail}</span>
                            </p>
                            <p style="margin: 12px 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                              <strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                            </p>
                          </div>

                          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                            <p style="margin: 0 0 10px; color: #991b1b; font-size: 15px; font-weight: 600;">
                              Você não solicitou esta alteração?
                            </p>
                            <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                              Se você não reconhece esta solicitação, sua conta pode estar comprometida. Entre em contato conosco <strong>imediatamente</strong> para proteger sua conta.
                            </p>
                          </div>

                          <p style="margin: 25px 0 15px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                            <strong>O que acontece agora?</strong>
                          </p>
                          <ul style="margin: 0 0 25px; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                            <li>Um e-mail de confirmação foi enviado para <strong>${novoEmail}</strong></li>
                            <li>A alteração só será efetivada após a confirmação no novo e-mail</li>
                            <li>Se não for confirmado em 24 horas, a solicitação será cancelada automaticamente</li>
                            <li>Seu e-mail atual permanecerá ativo até a confirmação</li>
                          </ul>

                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                            Este é um e-mail automático de segurança. Se você tiver dúvidas, entre em contato com nossa equipe.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9fafb; padding: 25px 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 10px; color: #1f2937; font-size: 15px; font-weight: 600;">
                            Clínica Dr. Roberto Nigro
                          </p>
                          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                            Contato: (11) 96572-1206<br>
                            E-mail: admclinicarobertonigro@gmail.com
                            Site: www.clinicadrrobertonigro.com.br
                          </p>
                          <p style="margin: 15px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                            © ${new Date().getFullYear()} Clínica Dr. Roberto Nigro. Todos os direitos reservados.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
      }

      await sendEmail({
        to: novoEmail,
        subject: "Confirme sua Alteração de E-mail",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Confirme seu Novo E-mail</h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Olá!
                        </p>

                        <p style="margin: 0 0 25px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                          Você solicitou a alteração do e-mail da sua conta na <strong>Clínica Dr. Roberto Nigro</strong>.
                        </p>

                        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                            <strong>Novo e-mail:</strong> ${novoEmail}
                          </p>
                        </div>

                        <p style="margin: 25px 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                          Para concluir a alteração, clique no botão abaixo:
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
                                Confirmar Alteração de E-mail
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 25px 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Ou copie e cole o link abaixo no seu navegador:
                        </p>
                        <div style="background-color: #f9fafb; padding: 12px 15px; border-radius: 6px; border: 1px solid #e5e7eb; word-break: break-all;">
                          <p style="margin: 0; color: #3b82f6; font-size: 13px; font-family: monospace;">
                            ${link}
                          </p>
                        </div>

                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 30px 0; border-radius: 4px;">
                          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">
                            Link válido por 24 horas
                          </p>
                          <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.6;">
                            Este link expira em 24 horas. Após esse período, você precisará solicitar uma nova alteração.
                          </p>
                        </div>

                        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                          <p style="margin: 0 0 8px; color: #991b1b; font-size: 14px; font-weight: 600;">
                            Você não solicitou esta alteração?
                          </p>
                          <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.6;">
                            Se você não reconhece esta solicitação, ignore este e-mail. Nenhuma alteração será feita em sua conta.
                          </p>
                        </div>

                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                          Este é um e-mail automático. Por favor, não responda a esta mensagem.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 25px 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #1f2937; font-size: 15px; font-weight: 600;">
                          Clínica Dr. Roberto Nigro
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                          Contato: (11) 96572-1206<br>
                          E-mail: admclinicarobertonigro@gmail.com
                          Site: www.clinicadrrobertonigro.com.br
                        </p>
                        <p style="margin: 15px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                          © ${new Date().getFullYear()} Clínica Dr. Roberto Nigro. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

    } catch (err) {
      logger.error("Erro ao enviar e-mail:", err);
      throw new HttpsError("internal", "Erro ao enviar e-mails.");
    }

    return { sucesso: true };
  }
);
