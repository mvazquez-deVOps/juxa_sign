import "server-only";

import { isMemoryDataStore } from "@/lib/data/mode";

const DIGID_KEYS = [
  "DIGID_API_BASE",
  "DIGID_LEGACY_BASE",
  "DIGID_USUARIO",
  "DIGID_CLAVE",
  "DIGID_TOKEN",
  "DIGID_MODO",
] as const;

/** Resumen para UI de configuración (sin exponer secretos). */
export function getDigidConnectionSummary(): {
  dataStoreMemory: boolean;
  missingDigidKeys: string[];
  readyForRealDigid: boolean;
} {
  const dataStoreMemory = isMemoryDataStore();
  const missingDigidKeys = DIGID_KEYS.filter((k) => !process.env[k]?.trim());
  const readyForRealDigid = missingDigidKeys.length === 0;

  return {
    dataStoreMemory,
    missingDigidKeys: [...missingDigidKeys],
    readyForRealDigid,
  };
}
