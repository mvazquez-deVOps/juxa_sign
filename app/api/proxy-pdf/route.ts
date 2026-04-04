import { NextRequest, NextResponse } from "next/server";
import {
  normalizeCorruptLoopbackDocumentUrl,
  resolveLoopbackPdfFetchUrl,
  tryReadLoopbackPublicPdf,
} from "@/lib/pdf-proxy-resolve-url";

const ALLOWED_HOSTS = ["digidmexico.com.mx", "dev.digidmexico.com.mx"];

function isLoopbackPdfHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function allowLoopbackProxy(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.JUXA_PROXY_PDF_ALLOW_LOCALHOST === "1";
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Falta url" }, { status: 400 });
  }
  const url = normalizeCorruptLoopbackDocumentUrl(raw, req);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    try {
      parsed = new URL(decodeURIComponent(url));
    } catch {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }
  }
  const digidOk = ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
  const localOk = isLoopbackPdfHost(parsed.hostname) && allowLoopbackProxy();
  if (!digidOk && !localOk) {
    return NextResponse.json({ error: "Host no permitido" }, { status: 403 });
  }
  if (localOk) {
    const localBuf = await tryReadLoopbackPublicPdf(parsed);
    if (localBuf && localBuf.byteLength >= 5) {
      const head = localBuf.subarray(0, 5);
      const sig = String.fromCharCode(...head);
      if (sig === "%PDF-") {
        return new NextResponse(new Uint8Array(localBuf), {
          headers: {
            "Content-Type": "application/pdf",
            "Cache-Control": "private, max-age=300",
          },
        });
      }
    }
  }

  const fetchUrl = localOk ? resolveLoopbackPdfFetchUrl(parsed, req) : url;
  const token = process.env.DIGID_TOKEN?.trim();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(fetchUrl, { headers });
  if (!res.ok) {
    return NextResponse.json({ error: "No se pudo obtener el PDF" }, { status: 502 });
  }
  const buf = await res.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 5));
  const sig = String.fromCharCode(...head);
  if (sig !== "%PDF-") {
    return NextResponse.json(
      {
        error:
          "La URL no devolvió un PDF válido (p. ej. página de error o sesión expirada). Revisa el token DIGID y la UrlDocumento.",
      },
      { status: 502 },
    );
  }
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, max-age=300",
    },
  });
}
