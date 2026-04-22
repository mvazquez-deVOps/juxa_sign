/** Estados en los que no se permite cancelar desde el panel (coincide con la server action). */
export function isDocumentCancelBlocked(status: string | null | undefined): boolean {
  if (!status?.trim()) return false;
  const u = status.trim().toUpperCase();
  if (u === "CANCELED" || u === "CANCELLED" || u === "CANCELADO") return true;
  if (u === "COMPLETED" || u.includes("COMPLETADO")) return true;
  return false;
}

/** Documento firmado / flujo terminado (DIGID puede enviar variantes con “COMPLETADO”). */
export function isDocumentCompleted(status: string | null | undefined): boolean {
  if (!status?.trim()) return false;
  const u = status.trim().toUpperCase();
  return u === "COMPLETED" || u.includes("COMPLETADO");
}
