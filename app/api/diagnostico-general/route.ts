import { NextResponse } from "next/server";

/**
 * Sonda HTTP hacia DIGID (Bearer + Legacy). Solo diagnóstico; no usar en producción expuesta.
 */
export async function GET() {
  const bearerBase = process.env.DIGID_API_BASE?.replace(/\/$/, "") || "";
  const legacyBase = process.env.DIGID_LEGACY_BASE?.replace(/\/$/, "") || "";
  const token = process.env.DIGID_TOKEN;

  const resultados: Record<string, unknown> = {};

  // 1. Prueba API Bearer (ej. crear firmante)
  try {
    const resFirmante = await fetch(`${bearerBase}/signatory/save_signatory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        IdClient: 91000,
        Name: "Firmante Test",
        Email: "test@test.com",
      }),
    });
    resultados.endpoint_bearer_firmante = {
      estado_http: resFirmante.status,
      respuesta: await resFirmante.text(),
    };
  } catch (e: unknown) {
    resultados.endpoint_bearer_firmante = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 2. Prueba API Legacy (ej. info documento)
  try {
    const urlLegacy = legacyBase.toLowerCase().endsWith(".php")
      ? `${legacyBase}?action=dInfoDocto`
      : `${legacyBase}/dInfoDocto`;

    const resLegacy = await fetch(urlLegacy, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        Usuario: process.env.DIGID_USUARIO,
        Clave: process.env.DIGID_CLAVE,
        Token: process.env.DIGID_TOKEN,
        Modo: process.env.DIGID_MODO,
        IdCliente: 91000,
        IdDocumento: 1,
      }),
    });
    resultados.endpoint_legacy_info_doc = {
      estado_http: resLegacy.status,
      url_atacada: urlLegacy,
      respuesta: await resLegacy.text(),
    };
  } catch (e: unknown) {
    resultados.endpoint_legacy_info_doc = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(resultados, { headers: { "Cache-Control": "no-store" } });
}
