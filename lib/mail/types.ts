export type TransactionalEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Sobrescribe remitente si el proveedor lo permite */
  from?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };
