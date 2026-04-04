/**
 * URL base pública (sin barra final) para armar enlaces a PDFs estáticos y mocks.
 * Evita cadenas vacías y localhost sin puerto (que apuntarían al :80 equivocado).
 */
export function appBaseUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  // Evita bases rotas tipo http://localhost%ruta (falta :puerto/); rompe UrlDocumento en mocks.
  const broken = /^https?:\/\/localhost%([^/]+\.pdf)$/i.exec(raw);
  if (broken) {
    raw = `http://localhost:3333/${broken[1].replace(/^\/+/, "")}`;
  }
  if (!raw) return "http://localhost:3333";
  try {
    const u = new URL(raw);
    const loop =
      u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]" || u.hostname === "::1";
    if (loop && !u.port) {
      return `${u.protocol}//${u.hostname}:3333`;
    }
    return raw;
  } catch {
    return "http://localhost:3333";
  }
}

/**
 * Origen para enlaces de firma en correos (mock DIGID) y textos que deben coincidir con donde corres `npm run dev`.
 * Prioriza `JUXA_LOCAL_SIGNING_BASE_URL` en servidor para no depender solo de `NEXT_PUBLIC_APP_URL` (p. ej. puerto 3000 vs 3333).
 */
export function signingLinkBaseUrl(): string {
  const local = process.env.JUXA_LOCAL_SIGNING_BASE_URL?.trim().replace(/\/$/, "");
  if (local) {
    try {
      const u = new URL(local);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* usar appBaseUrl */
    }
  }
  return appBaseUrl();
}
