import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/**
 * PDF de prueba para enlaces de firma en modo mock (firmante sin sesión en el panel).
 * Sirve el mismo archivo que /public/demo-sample.pdf con cabeceras explícitas; Safari suele
 * comportarse mejor que con el estático + ?query en desarrollo.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "public", "demo-sample.pdf");
  const buf = await readFile(filePath);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="demo-sample.pdf"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
