import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  dbDocumentFindFirstByDigidSelectStatus,
  dbDocumentNotifyContextByDigidId,
  dbDocumentUpdateManyStatusByDigid,
  dbOrgAdminEmailsForNotify,
  dbWebhookCreate,
  dbWebhookFindDuplicate,
  dbWebhookUpdate,
} from "@/lib/data/repository";
import { sendDocumentStatusNotification } from "@/lib/mail/send-transactional";
import { extractWebhookDocumentId, extractWebhookStatus } from "@/lib/webhook-parse";
import { allowWebhookRequest } from "@/lib/webhook-rate-limit";

/** Reintentos con el mismo cuerpo (y misma cabecera opcional) no duplican efectos en documentos. */
const DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function payloadDedupeKey(req: NextRequest, raw: string): string {
  const delivery =
    req.headers.get("x-digid-delivery-id") ??
    req.headers.get("x-request-id") ??
    req.headers.get("x-webhook-delivery-id") ??
    "";
  return createHash("sha256").update(`${delivery}\n${raw}`, "utf8").digest("hex");
}

/**
 * DIGID notifica cambios de documento. 
 * HOMOLOGADO: La respuesta siempre debe coincidir con el estándar de WeTrust { Success: boolean, Message: string }
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
    
  if (!allowWebhookRequest(ip)) {
    // Homologado a WeTrust
    return NextResponse.json({ Success: false, Message: "Too many requests" }, { status: 429 });
  }

  const secret = process.env.DIGID_WEBHOOK_SECRET?.trim();
  if (secret) {
    const q = req.nextUrl.searchParams.get("secret");
    const h = req.headers.get("x-digid-secret");
    if (q !== secret && h !== secret) {
      // Homologado a WeTrust
      return NextResponse.json({ Success: false, Message: "Unauthorized webhook access" }, { status: 401 });
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    // Homologado a WeTrust
    return NextResponse.json({ Success: false, Message: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const payloadHash = payloadDedupeKey(req, raw);
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const prior = await dbWebhookFindDuplicate(payloadHash, since);
  
  if (prior) {
    // Homologado a WeTrust: Incluso si es duplicado, respondemos Success: true para que DIGID deje de insistir.
    return NextResponse.json({ Success: true, Message: "Evento recibido previamente (Duplicado)" }, { status: 200 });
  }

  const event = await dbWebhookCreate(raw, payloadHash);

  let parseError: string | null = null;
  let documentDigidId: number | null = null;
  let parsedStatus: string | null = null;

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    documentDigidId = extractWebhookDocumentId(data);
    parsedStatus = extractWebhookStatus(data);

    if (documentDigidId != null && parsedStatus) {
      const existing = await dbDocumentFindFirstByDigidSelectStatus(documentDigidId);
      const prevStatus = existing?.status ?? null;
      const statusChanged = Boolean(existing && prevStatus !== parsedStatus);
      
      if (statusChanged) {
        await dbDocumentUpdateManyStatusByDigid(documentDigidId, parsedStatus);
      }
      
      if (statusChanged && process.env.JUXA_WEBHOOK_NOTIFY === "1") {
        const ctx = await dbDocumentNotifyContextByDigidId(documentDigidId);
        const orgId = ctx?.organizationId;
        if (ctx && orgId) {
          const extra =
            process.env.JUXA_WEBHOOK_NOTIFY_EMAILS?.split(/[,;]/).map((s) => s.trim()).filter(Boolean) ?? [];
          const admins = await dbOrgAdminEmailsForNotify(orgId);
          const to = [...new Set([...admins, ...extra])];
          if (to.length > 0) {
            const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
            const panelUrl = base ? `${base}/documentos/${ctx.id}` : undefined;
            const mailRes = await sendDocumentStatusNotification({
              to,
              documentName: ctx.nameDoc,
              status: parsedStatus,
              panelUrl,
            });
            if (!mailRes.ok) {
              console.warn("[webhook] notify mail:", mailRes.error);
            }
          }
        }
      }
      await dbWebhookUpdate(event.id, {
        processed: true,
        documentDigidId,
        parsedStatus,
        parseError: null,
      });
    } else {
      await dbWebhookUpdate(event.id, {
        processed: true,
        documentDigidId,
        parsedStatus,
        parseError:
          documentDigidId == null && !parsedStatus
            ? "JSON válido pero sin IdDocumento/estado reconocibles"
            : documentDigidId == null
              ? "Sin Id de documento reconocible"
              : "Sin estado/status reconocible",
      });
    }
  } catch (e) {
    parseError = e instanceof Error ? e.message : "Error al interpretar payload";
    await dbWebhookUpdate(event.id, { processed: true, parseError });
  }

  // Homologado a WeTrust: Respuesta final exitosa
  return NextResponse.json({ Success: true, Message: "Webhook procesado correctamente" }, { status: 200 });
}