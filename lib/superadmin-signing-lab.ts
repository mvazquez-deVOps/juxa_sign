/**
 * Laboratorio de envío a firma en /superadmin (PDF + correo del firmante).
 * Desactivado en producción salvo override explícito.
 */
export function isSuperadminSigningLabEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.JUXA_SUPERADMIN_SIGNING_LAB?.trim() === "1";
}
