import { DEMO_SYNTHETIC_USER_ID } from "@/lib/session";

/** Demo cookie o variable de entorno: no descontar folios (E2E / desarrollo). */
export function shouldSkipFolioDebitForUserId(userId: string): boolean {
  if (userId === DEMO_SYNTHETIC_USER_ID) return true;
  if (process.env.JUXA_SKIP_FOLIO_DEBIT?.trim() === "1") return true;
  return false;
}
