import type { FolioLedgerReason } from "@prisma/client";

/** Créditos internos: envío estándar 1, con folio premium (NOM-151) 2. */
export function folioCreditsForSend(folioPremium: boolean): number {
  return folioPremium ? 2 : 1;
}

export function folioReasonForSend(folioPremium: boolean): FolioLedgerReason {
  return folioPremium ? "SEND_PREMIUM" : "SEND_STANDARD";
}
