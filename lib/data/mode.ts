/** Almacén en memoria (sin PostgreSQL). Los datos se pierden al reiniciar el servidor. */
export function isMemoryDataStore(): boolean {
  return process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory";
}
