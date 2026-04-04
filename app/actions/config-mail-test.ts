"use server";

import { z } from "zod";
import { sendSignerSigningInstructionsEmail } from "@/lib/mail/send-transactional";
import { alignLocalSigningUrlWithRequest } from "@/lib/align-local-signing-url";
import { signingLinkBaseUrl } from "@/lib/app-base-url";
import { canMutateSigningFlow, gateMutation } from "@/lib/gate";

const schema = z.object({
  recipientName: z.string().min(2).max(120),
  email: z.string().email(),
});

export type QuickSignerMailTestState = { ok: boolean; message?: string };

/**
 * Envía el mismo tipo de correo que al firmante tras enviar a firma, con enlace de prueba (/firma-prueba).
 * No crea documento ni llama a enviarAFirmar — solo valida Resend/SMTP y enlaces locales.
 */
export async function sendQuickSignerTestEmail(
  _prev: QuickSignerMailTestState | null,
  formData: FormData,
): Promise<QuickSignerMailTestState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  if (!canMutateSigningFlow(g.session.user.role)) {
    return { ok: false, message: "Tu perfil no puede enviar esta prueba." };
  }

  const parsed = schema.safeParse({
    recipientName: formData.get("recipientName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Indica nombre (mín. 2 caracteres) y un correo válido." };
  }

  const rawUrl = `${signingLinkBaseUrl()}/firma-prueba?rol=firmante`;
  const signingUrl = await alignLocalSigningUrlWithRequest(rawUrl);

  const r = await sendSignerSigningInstructionsEmail({
    to: parsed.data.email.trim(),
    recipientName: parsed.data.recipientName.trim(),
    documentName: "Prueba rápida (Configuración)",
    signingUrl,
  });

  if (!r.ok) {
    return {
      ok: false,
      message: r.error ?? "No se pudo enviar. Revisa MAIL_PROVIDER, RESEND_API_KEY o SMTP en .env.",
    };
  }
  return { ok: true, message: "Listo: revisa la bandeja del correo (y spam)." };
}
