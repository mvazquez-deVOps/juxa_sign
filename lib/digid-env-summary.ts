import "server-only";

import { isDigidMocked, isMemoryDataStore } from "@/lib/data/mode";

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
  digidMocked: boolean;
  dataStoreMemory: boolean;
  digidMockEnv: string | null;
  missingDigidKeys: string[];
  readyForRealDigid: boolean;
} {
  const digidMocked = isDigidMocked();
  const dataStoreMemory = isMemoryDataStore();
  const raw = process.env.DIGID_MOCK?.trim();
  const digidMockEnv = raw && raw.length > 0 ? raw : null;
  const missingDigidKeys = DIGID_KEYS.filter((k) => !process.env[k]?.trim());
  const readyForRealDigid = !digidMocked && missingDigidKeys.length === 0;

  return {
    digidMocked,
    dataStoreMemory,
    digidMockEnv,
    missingDigidKeys: [...missingDigidKeys],
    readyForRealDigid,
  };
}
