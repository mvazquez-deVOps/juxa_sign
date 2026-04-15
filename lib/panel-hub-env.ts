import { isMemoryDataStore } from "@/lib/data/mode";

/** Resumen seguro para la UI (sin secretos). */
export function getPanelHubEnvSummary(): {
  memoryDataStore: boolean;
  digidModo: string;
  digidApiHost: string;
  digidLegacyHost: string;
  digidCredsConfigured: boolean;
  nextPublicAppUrlSet: boolean;
  webhookSecretSet: boolean;
} {
  const digidModo = process.env.DIGID_MODO?.trim() || "(no definido)";
  const apiHost = safeUrlHost(process.env.DIGID_API_BASE);
  const legacyHost = safeUrlHost(process.env.DIGID_LEGACY_BASE);
  return {
    memoryDataStore: isMemoryDataStore(),
    digidModo,
    digidApiHost: apiHost,
    digidLegacyHost: legacyHost,
    digidCredsConfigured: Boolean(
      process.env.DIGID_USUARIO?.trim() &&
        process.env.DIGID_CLAVE?.trim() &&
        process.env.DIGID_TOKEN?.trim(),
    ),
    nextPublicAppUrlSet: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    webhookSecretSet: Boolean(process.env.DIGID_WEBHOOK_SECRET?.trim()),
  };
}

function safeUrlHost(raw: string | undefined): string {
  if (!raw?.trim()) return "(no definido)";
  try {
    return new URL(raw.trim()).host;
  } catch {
    return "(URL inválida)";
  }
}
