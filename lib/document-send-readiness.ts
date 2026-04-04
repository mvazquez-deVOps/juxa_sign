import { dbDocumentForEnviarInOrg } from "@/lib/data/repository";
import {
  evaluateSendReadinessFromEnviarShape,
  type DocumentSendReadiness,
  type SendReadinessDocInput,
} from "@/lib/send-readiness-eval";

export type { DocumentSendReadiness, SendReadinessDocInput };

export { evaluateSendReadinessFromEnviarShape };

export async function getDocumentSendReadiness(
  documentId: string,
  organizationId: string,
): Promise<DocumentSendReadiness> {
  const full = await dbDocumentForEnviarInOrg(documentId, organizationId);
  if (!full || !("placements" in full) || !("signatories" in full)) {
    return { ready: false, message: "Documento no encontrado." };
  }
  return evaluateSendReadinessFromEnviarShape({
    placements: full.placements,
    signatories: full.signatories,
  });
}
