import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DIGID notifica cambios de documento. Ajusta el parsing según el payload real que envíe DIGID.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DIGID_WEBHOOK_SECRET?.trim();
  if (secret) {
    const q = req.nextUrl.searchParams.get("secret");
    const h = req.headers.get("x-digid-secret");
    if (q !== secret && h !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const since = new Date(Date.now() - 60_000);
  const duplicate = await prisma.webhookEvent.findFirst({
    where: { payload: raw, receivedAt: { gte: since } },
  });
  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const event = await prisma.webhookEvent.create({
    data: { payload: raw, processed: false },
  });

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const idDoc =
      (typeof data.IdDocumento === "number" && data.IdDocumento) ||
      (typeof data.IdDocument === "number" && data.IdDocument) ||
      (typeof data.idDocumento === "number" && data.idDocumento) ||
      (typeof data.documentId === "number" && data.documentId);
    const estado = typeof data.estado === "string" ? data.estado : typeof data.status === "string" ? data.status : null;

    if (typeof idDoc === "number" && estado) {
      const existing = await prisma.document.findFirst({
        where: { digidDocumentId: idDoc },
        select: { status: true },
      });
      if (existing && existing.status !== estado) {
        await prisma.document.updateMany({
          where: { digidDocumentId: idDoc },
          data: { status: estado },
        });
      }
    }
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });
  } catch {
    /* payload no JSON o esquema distinto */
  }

  return NextResponse.json({ received: true });
}
