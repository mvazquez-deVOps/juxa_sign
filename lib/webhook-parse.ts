/**
 * Extracción tolerante de campos típicos en payloads webhook DIGID (pueden variar por versión).
 */

export function extractWebhookDocumentId(data: Record<string, unknown>): number | null {
  const directKeys = [
    "IdDocumento",
    "IdDocument",
    "idDocumento",
    "documentId",
    "IdDoc",
    "id_doc",
    "idDocument",
  ];
  for (const k of directKeys) {
    const n = coercePositiveInt(data[k]);
    if (n != null) return n;
  }
  const inner = data.Data ?? data.data ?? data.payload;
  if (inner && typeof inner === "object") {
    return extractWebhookDocumentId(inner as Record<string, unknown>);
  }
  return null;
}

export function extractWebhookStatus(data: Record<string, unknown>): string | null {
  const keys = ["estado", "status", "Estado", "Status", "estatus", "Estatus"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const inner = data.Data ?? data.data ?? data.payload;
  if (inner && typeof inner === "object") {
    return extractWebhookStatus(inner as Record<string, unknown>);
  }
  return null;
}

function coercePositiveInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.trunc(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) {
    const n = parseInt(v.trim(), 10);
    return n > 0 ? n : null;
  }
  return null;
}
