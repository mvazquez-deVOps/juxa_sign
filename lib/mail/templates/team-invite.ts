/**
 * Plantilla HTML de invitación al equipo (string literal, sin React).
 * Las URLs usan `baseUrl` público para que el logo y el enlace carguen en el cliente de correo.
 */

export function escapeHtmlForEmail(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type TeamInviteEmailParams = {
  organizationName: string;
  /** Token plano de la invitación (se codifica en la ruta). */
  token: string;
  /** Origen público de la app, sin barra final (ej. https://app.ejemplo.com). */
  baseUrl: string;
};

/**
 * HTML completo del correo de invitación (estilos inline, layout tipo tabla).
 */
export function buildTeamInviteEmailSubject(organizationName: string): string {
  return `Invitación para unirte a ${organizationName} en Juxa Sign`;
}

export function buildTeamInviteEmailText(
  params: TeamInviteEmailParams & {
    roleLabel: string;
  },
): string {
  const baseNorm = params.baseUrl.replace(/\/$/, "");
  const inviteUrl = `${baseNorm}/invitacion/${params.token}`;
  return [
    "¡Te damos la bienvenida!",
    "",
    `Has sido invitado a unirte al espacio de trabajo de ${params.organizationName} en Juxa Sign. Al aceptar esta invitación, podrás colaborar en la gestión y envío de documentos para firma electrónica con validez legal (NOM-151).`,
    "",
    `Rol asignado: ${params.roleLabel}.`,
    "",
    "Aceptar invitación (caduca en 7 días):",
    inviteUrl,
    "",
    "Si no esperabas esta invitación, puedes ignorar este correo. El equipo de Juxa Sign.",
  ].join("\n");
}

export function buildTeamInviteEmailHtml(params: TeamInviteEmailParams): string {
  const baseNorm = params.baseUrl.replace(/\/$/, "");
  const safeOrg = escapeHtmlForEmail(params.organizationName);
  const invitePath = `/invitacion/${encodeURIComponent(params.token)}`;
  const inviteUrl = `${baseNorm}${invitePath}`;
  const safeInviteHref = escapeHtmlForEmail(inviteUrl);
  const safeLogoSrc = escapeHtmlForEmail(`${baseNorm}/LOGO2.png`);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación Juxa Sign</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid #eef2f6;">
              <img src="${safeLogoSrc}" alt="Juxa Sign" width="200" style="max-width:100%;height:auto;display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 8px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0f172a;text-align:center;">¡Te damos la bienvenida!</h1>
              <p style="margin:0 0 20px;font-size:16px;color:#334155;">
                Has sido invitado a unirte al espacio de trabajo de <strong>${safeOrg}</strong> en Juxa Sign. Al aceptar esta invitación, podrás colaborar en la gestión y envío de documentos para firma electrónica con validez legal (NOM-151).
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:28px 0 8px;">
                    <a href="${safeInviteHref}" style="display:inline-block;padding:14px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 2px 8px rgba(37,99,235,0.35);">Aceptar Invitación</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;text-align:center;word-break:break-all;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <span style="color:#2563eb;">${safeInviteHref}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 36px;background-color:#f8fafc;border-top:1px solid #eef2f6;">
              <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
                Si no esperabas esta invitación, puedes ignorar este correo. El equipo de Juxa Sign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
