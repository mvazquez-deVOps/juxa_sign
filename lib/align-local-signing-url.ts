import { headers } from "next/headers";

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * En desarrollo, si el mock devolvió `http://localhost:PUERTO_INCORRECTO/...` y el panel se abrió con otro
 * puerto, Safari (y otros) fallan al abrir el enlace. Sustituye el origen por el `Host` de la petición actual.
 */
export async function alignLocalSigningUrlWithRequest(signingUrl: string): Promise<string> {
  if (process.env.NODE_ENV === "production") return signingUrl;
  if (process.env.JUXA_SIGNING_URL_NO_REQUEST_ALIGN?.trim() === "1") return signingUrl;

  let target: URL;
  try {
    target = new URL(signingUrl);
  } catch {
    return signingUrl;
  }
  if (!isLoopbackHostname(target.hostname)) return signingUrl;

  const h = await headers();
  const hostHeader = (h.get("x-forwarded-host") ?? h.get("host") ?? "").trim().split(",")[0]?.trim() ?? "";
  if (!hostHeader) return signingUrl;

  let requestOrigin: URL;
  try {
    const protoHead = (h.get("x-forwarded-proto") ?? "http").trim().split(",")[0]?.trim();
    const proto = protoHead === "https" ? "https" : "http";
    requestOrigin = new URL(`${proto}://${hostHeader}`);
  } catch {
    return signingUrl;
  }

  if (!isLoopbackHostname(requestOrigin.hostname)) return signingUrl;

  target.protocol = requestOrigin.protocol;
  target.host = requestOrigin.host;
  return target.toString();
}
