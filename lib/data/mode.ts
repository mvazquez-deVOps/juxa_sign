/** Almacén en memoria (sin PostgreSQL). Los datos se pierden al reiniciar el servidor. */
export function isMemoryDataStore(): boolean {
  return process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory";
}

/**
 * Respuestas DIGID simuladas.
 * - `DIGID_MOCK=0|false|no` → siempre API real (útil con Postgres para sandbox/producción).
 * - `DIGID_MOCK=1|true|yes` → siempre mock.
 * - Sin variable: si `JUXA_DATA_STORE=memory` → mock (compat); con Postgres → API real.
 */
export function isDigidMocked(): boolean {
  const m = process.env.DIGID_MOCK?.trim().toLowerCase();
  if (m === "0" || m === "false" || m === "no") return false;
  if (m === "1" || m === "true" || m === "yes") return true;
  return isMemoryDataStore();
}
