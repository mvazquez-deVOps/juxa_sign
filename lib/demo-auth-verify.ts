/**
 * Verificación de sesión demo (solo Web Crypto — usable en middleware Edge).
 */
export const DEMO_SESSION_COOKIE = "juxa_demo_session";

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compara strings en tiempo ~constante para firmas de igual longitud. */
function timingSafeEqualHex(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyDemoSessionValue(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sigHex] = parts;
  if (!expStr || !/^\d+$/.test(expStr)) return false;
  if (!sigHex || !/^[0-9a-f]+$/i.test(sigHex)) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(expStr));
  const expectedHex = bytesToHex(sigBuf);
  return timingSafeEqualHex(expectedHex, sigHex);
}
