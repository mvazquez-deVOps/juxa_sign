import { NextResponse } from "next/server";

/**
 * Comprobación ligera para balanceadores y smoke tests post-deploy.
 * No consulta la base de datos (evita falsos negativos si Postgres arranca después del proceso).
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "juxa-sign",
      ts: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
