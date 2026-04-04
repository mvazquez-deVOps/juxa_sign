/** Subconjunto de la vista “enviar” suficiente para validar listo para firma. */
export type SendReadinessDocInput = {
  placements: { signatoryId: string }[];
  signatories: {
    signatoryId: string;
    signatory: { name: string; email: string | null; phone: string | null };
  }[];
};

export type DocumentSendReadiness =
  | { ready: true }
  | { ready: false; message: string };

/** Reglas alineadas con el envío manual a firma (marcas, firmantes, contacto). */
export function evaluateSendReadinessFromEnviarShape(doc: SendReadinessDocInput | null): DocumentSendReadiness {
  if (!doc) {
    return { ready: false, message: "Documento no encontrado." };
  }
  if (!doc.placements.length) {
    return { ready: false, message: "Agrega al menos una marca de firma en el visor PDF." };
  }
  const assignedIds = new Set(doc.signatories.map((ds) => ds.signatoryId));
  for (const p of doc.placements) {
    if (!assignedIds.has(p.signatoryId)) {
      return {
        ready: false,
        message:
          "Hay al menos una marca de un firmante que no está asignado al documento. Revisa el visor o sincroniza la asignación.",
      };
    }
  }
  for (const ds of doc.signatories) {
    if (!doc.placements.some((pl) => pl.signatoryId === ds.signatoryId)) {
      return {
        ready: false,
        message: `Cada firmante asignado debe tener al menos una marca en el PDF. Falta marca para ${ds.signatory.name}.`,
      };
    }
    const sig = ds.signatory;
    if (!sig.email?.trim() && !sig.phone?.trim()) {
      return {
        ready: false,
        message: `El firmante ${sig.name} no tiene correo ni teléfono; el proveedor lo requiere para notificar.`,
      };
    }
  }
  return { ready: true };
}
