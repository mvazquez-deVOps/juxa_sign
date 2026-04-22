import type { FolioLedgerReason } from "@prisma/client";

/** Textos para `FolioLedgerReason` en tablas e informes (es-MX). */
export const FOLIO_LEDGER_REASON_LABELS: Record<FolioLedgerReason, string> = {
  SUPERADMIN_GRANT: "Acreditación plataforma",
  PURCHASE: "Compra",
  SEND_STANDARD: "Envío estándar",
  SEND_PREMIUM: "Envío premium",
  ADMIN_TRANSFER: "Transferencia administrador",
  ADJUSTMENT: "Ajuste",
  TRIAL_GRANT: "Folio de bienvenida",
  KYC_VALIDATION: "Validación de identidad",
};

export function folioLedgerReasonLabel(reason: string): string {
  return FOLIO_LEDGER_REASON_LABELS[reason as FolioLedgerReason] ?? reason;
}

/** Indica qué cartera refleja `balanceAfter` en la fila del ledger. */
export function folioLedgerCarteraLabel(reason: string): string {
  return reason === "KYC_VALIDATION" ? "Identidad (KYC)" : "Envíos (folios)";
}
