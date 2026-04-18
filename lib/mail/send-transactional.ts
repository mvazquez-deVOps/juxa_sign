import "server-only";

import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { SendEmailResult, TransactionalEmailInput } from "@/lib/mail/types";

function mailRequired(): boolean {
  return process.env.JUXA_MAIL_REQUIRED === "1" || process.env.MAIL_REQUIRED === "1";
}

/** Remitente por defecto (Resend onboarding o dominio verificado vía MAIL_FROM). */
function defaultFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Juxa Sign <onboarding@resend.dev>"
  );
}

function logSkipped(reason: string, input: TransactionalEmailInput): SendEmailResult {
  if (process.env.NODE_ENV !== "production") {
    console.info("[mail:skip]", reason, {
      to: input.to,
      subject: input.subject,
      preview: input.text.slice(0, 200),
    });
  }
  if (mailRequired()) {
    return { ok: false, error: `Correo requerido pero no enviado: ${reason}` };
  }
  return { ok: true };
}

async function sendViaResend(input: TransactionalEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return logSkipped("RESEND_API_KEY no definida", input);

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const from = input.from?.trim() || defaultFrom();

  const resend = new Resend(key);

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    if (error) {
      const msg = "message" in error && typeof error.message === "string" ? error.message : JSON.stringify(error);
      console.error("[mail:resend]", msg);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail:resend]", msg);
    return { ok: false, error: msg };
  }
}

async function sendViaSmtp(input: TransactionalEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const skipAuth = process.env.SMTP_SKIP_AUTH === "1";
  if (!host || (!skipAuth && (!user || !pass))) {
    return logSkipped(
      skipAuth
        ? "SMTP_HOST no definido"
        : "SMTP_HOST / SMTP_USER / SMTP_PASS incompletos (o SMTP_SKIP_AUTH=1 para SMTP sin auth)",
      input,
    );
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "1" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(skipAuth ? {} : { auth: { user: user!, pass: pass! } }),
  });

  const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;
  const from = input.from?.trim() || defaultFrom();

  try {
    await transporter.sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Envía correo transaccional: con `RESEND_API_KEY` usa la API de Resend;
 * si `MAIL_PROVIDER=smtp` (sin clave Resend) usa SMTP; `MAIL_PROVIDER=resend` fuerza Resend (requiere clave).
 */
export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<SendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const provider = (process.env.MAIL_PROVIDER || "none").trim().toLowerCase();

  if (resendKey || provider === "resend") {
    return sendViaResend(input);
  }
  if (provider === "smtp") {
    return sendViaSmtp(input);
  }

  return logSkipped(`MAIL_PROVIDER=${provider || "none"}`, input);
}

/**
 * Instrucciones al firmante con enlace personal de firma (DIGID).
 * Complementa (no sustituye) SMS/correo que el proveedor pueda enviar al mismo destinatario.
 */
export async function sendSignerSigningInstructionsEmail(input: {
  to: string;
  recipientName: string;
  documentName: string;
  signingUrl: string;
}): Promise<SendEmailResult> {
  const name = input.recipientName.trim() || "Hola";
  const isLocalHost =
    /localhost|127\.0\.0\.1|\[::1\]/i.test(input.signingUrl) ||
    input.signingUrl.includes("://::1");
  const localNote = isLocalHost
    ? [
        "",
        "Pruebas en tu computadora: usa la URL completa (http://localhost:PUERTO/...). No escribas solo «localhost» en el navegador (Safari usa el puerto 80 y verás página en blanco).",
        "El puerto debe ser el mismo que muestra la terminal al ejecutar npm run dev (si Safari dice «problema repetidamente», suele ser que en ese puerto no está corriendo la app).",
        "",
      ].join("\n")
    : "";
  const text = [
    `${name},`,
    "",
    `Tienes un documento pendiente de firma electrónica: «${input.documentName}».`,
    "",
    "1) Abre el enlace personal de firma (solo tú debes usarlo):",
    input.signingUrl,
    localNote,
    "2) Sigue las indicaciones en pantalla del proveedor de firma hasta completar el proceso.",
    "",
    "Si el enlace no abre o caducó, pide a quien te envió el documento que vuelva a enviar la invitación desde Juxa Sign.",
    "",
    "Este mensaje lo envía Juxa Sign en nombre de tu organización. El proveedor de firma puede enviarte avisos adicionales por SMS u otro correo.",
  ].join("\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: `Juxa Sign — Firma pendiente: ${input.documentName}`,
    text,
  });
}

/** Copia al equipo u observador tras preparar envío (no sustituye el correo del proveedor DIGID al firmante). */
export async function sendSigningFlowNotification(input: {
  to: string[];
  documentName: string;
  panelUrl: string;
  summary: string;
}): Promise<SendEmailResult> {
  if (!input.to.length) return { ok: true };
  const text = [
    `Documento: ${input.documentName}`,
    "",
    input.summary,
    "",
    `Panel: ${input.panelUrl}`,
  ].join("\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: `Juxa Sign — ${input.documentName}: envío a firma`,
    text,
  });
}

/** Notificación de cambio de estado (p. ej. webhook DIGID). */
export async function sendDocumentStatusNotification(input: {
  to: string[];
  documentName: string;
  status: string;
  panelUrl?: string;
}): Promise<SendEmailResult> {
  if (!input.to.length) return { ok: true };
  const lines = [
    `El documento "${input.documentName}" cambió de estado.`,
    `Estado: ${input.status}`,
  ];
  if (input.panelUrl) lines.push("", `Panel: ${input.panelUrl}`);
  return sendTransactionalEmail({
    to: input.to,
    subject: `Juxa Sign — ${input.documentName}: ${input.status}`,
    text: lines.join("\n"),
  });
}
