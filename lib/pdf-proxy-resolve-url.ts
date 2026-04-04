import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

/**
 * Corrige URLs guardadas rotas, p. ej. `http://localhost%sample.pdf` (falta `:puerto/` entre host y archivo),
 * típico de `NEXT_PUBLIC_APP_URL` mal armada o respuestas raras del proveedor.
 */
export function normalizeCorruptLoopbackDocumentUrl(raw: string, req: NextRequest): string {
  const s = raw.trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3333";
  const proto = (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() || "http";

  const brokenPct = /^https?:\/\/localhost%([^/?#]+\.pdf)(\?[^#]*)?(#.*)?$/i.exec(s);
  if (brokenPct) {
    const file = brokenPct[1].replace(/^\/+/, "");
    return `${proto}://${host}/${file}${brokenPct[2] ?? ""}${brokenPct[3] ?? ""}`;
  }

  try {
    const u = new URL(s);
    const h = u.hostname.replace(/^\[|\]$/g, "");
    if ((h === "localhost" || h === "127.0.0.1") && !u.port && u.pathname.toLowerCase().endsWith(".pdf")) {
      return `${proto}://${host}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* intentar decode una vez */
  }

  try {
    const decoded = decodeURIComponent(s);
    if (decoded !== s && /^https?:\/\//i.test(decoded)) {
      return normalizeCorruptLoopbackDocumentUrl(decoded, req);
    }
  } catch {
    /* noop */
  }

  return s;
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Alias histórico: no existe en /public; el repo usa demo-sample.pdf */
function mapPublicPdfFilename(name: string): string {
  const n = name.toLowerCase();
  if (n === "sample.pdf") return "demo-sample.pdf";
  return name;
}

/**
 * Reescribe URLs locales de PDF para el fetch en /api/proxy-pdf:
 * - `http://localhost:sample.pdf` (puerto mal parseado) → mismo host que la petición + demo-sample.pdf
 * - `http://localhost/ruta.pdf` sin puerto → usa Host de la petición (3008 vs 80)
 * - `http://localhost:3000/...` con app en 3008 → alinea origen al Host actual
 */
export function resolveLoopbackPdfFetchUrl(parsed: URL, req: NextRequest): string {
  if (!isLoopbackHost(parsed.hostname)) return parsed.href;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() || "http";
  if (!host) return parsed.href;

  // Error típico: "http://localhost:archivo.pdf" — el parser pone el nombre en .port
  if (parsed.port && !/^\d{1,5}$/.test(parsed.port)) {
    let file = parsed.port;
    if (!/\.pdf$/i.test(file)) file = `${file}.pdf`;
    file = mapPublicPdfFilename(file);
    return `${proto}://${host}/${file}`;
  }

  const path = parsed.pathname || "";
  const isPdfPath = path.toLowerCase().endsWith(".pdf");
  if (isPdfPath) {
    const base = path.split("/").filter(Boolean).pop() ?? "";
    const mapped = mapPublicPdfFilename(base);
    const outPath = mapped !== base ? `/${mapped}` : path;
    return `${proto}://${host}${outPath}${parsed.search}`;
  }

  return parsed.href;
}

/**
 * Nombre de archivo bajo /public para URLs loopback tipo /archivo.pdf (un solo segmento).
 * Evita depender de fetch HTTP al mismo Next (middleware sin cookies → login HTML).
 */
export function loopbackPdfPublicBasename(parsed: URL): string | null {
  if (!isLoopbackHost(parsed.hostname)) return null;

  if (parsed.port && !/^\d{1,5}$/.test(parsed.port)) {
    let file = parsed.port;
    if (!/\.pdf$/i.test(file)) file = `${file}.pdf`;
    return mapPublicPdfFilename(file);
  }

  const p = parsed.pathname || "";
  if (!p.toLowerCase().endsWith(".pdf")) return null;
  const seg = p.split("/").filter(Boolean);
  if (seg.length !== 1) return null;
  return mapPublicPdfFilename(seg[0]);
}

/** Lee PDF desde public/ si la URL es loopback y apunta a un archivo en la raíz de /public. */
export async function tryReadLoopbackPublicPdf(parsed: URL): Promise<Buffer | null> {
  const base = loopbackPdfPublicBasename(parsed);
  if (!base || !/^[\w.-]+\.pdf$/i.test(base)) return null;
  const root = path.resolve(process.cwd(), "public");
  const abs = path.resolve(root, base);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}
