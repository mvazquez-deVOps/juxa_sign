export type TransactionalEmailInput = {
  to: string | string[];
  subject: string;
  /** Texto plano (accesibilidad y clientes sin HTML). */
  text: string;
  html?: string;
  /** Sobrescribe remitente si el proveedor lo permite */
  from?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };
