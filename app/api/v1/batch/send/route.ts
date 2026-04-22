import { NextRequest, NextResponse } from "next/server";
import { sendDocumentForSigningDefaults } from "@/app/actions/signing";
import { dbSigningJobCreate, dbSigningJobFindByOrgRef, dbSigningJobUpdate } from "@/lib/data/repository";
import { z } from "zod";
import { allowApiV1Request } from "@/lib/api-v1-rate-limit";
import { resolveApiKeyContext } from "@/lib/api-key-verify";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const bodySchema = z.object({
  documentId: z.string().cuid(),
  clientReference: z.string().min(1).max(200).optional(),
});

/**
 * Dispara envío a firma (opciones por defecto: **folio premium / NOM-151**, igual que envío manual y lotes).
 * Idempotencia: si envías `clientReference`, la misma org + referencia devuelve el job existente.
 * Descuenta folios de la cartera del usuario dueño de la API key (2 créditos por envío premium).
 */
export async function POST(req: NextRequest) {
  if (!allowApiV1Request(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiCtx = await resolveApiKeyContext(req);
  if (!apiCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { organizationId, ownerUserId } = apiCtx;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { documentId, clientReference } = parsed.data;

  if (clientReference) {
    const existing = await dbSigningJobFindByOrgRef(organizationId, clientReference);
    if (existing) {
      return NextResponse.json({
        jobId: existing.id,
        status: existing.status,
        result: existing.result,
        errorMessage: existing.errorMessage,
        deduplicated: true,
      });
    }
  }

  const job = await dbSigningJobCreate({
    organizationId,
    clientReference: clientReference ?? null,
    payload: { documentId },
  });

  await dbSigningJobUpdate(job.id, { status: "RUNNING" });
  const sendResult = await sendDocumentForSigningDefaults(organizationId, documentId, ownerUserId);

  if (sendResult.ok) {
    await dbSigningJobUpdate(job.id, {
      status: "DONE",
      result: { message: sendResult.message },
      errorMessage: null,
    });
    return NextResponse.json({
      jobId: job.id,
      status: "DONE",
      result: { message: sendResult.message },
    });
  }

  await dbSigningJobUpdate(job.id, {
    status: "ERROR",
    result: null,
    errorMessage: sendResult.message ?? "Error desconocido",
  });
  return NextResponse.json(
    { jobId: job.id, status: "ERROR", errorMessage: sendResult.message },
    { status: 422 },
  );
}
