"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbDocumentFindFirstInOrgWithCompany,
  dbDocumentFindFirstWithCompanyAndSignatoryLinks,
  dbDocumentSignatoryReplace,
  dbFolioGrantCredits,
  dbFolioTryDebitForSend,
  dbSignatoryFindManyByIds,
} from "@/lib/data/repository";
import {
  asignarFirmantesDocumento,
  enviarAFirmar,
  obtenerUrlFirmaDocumento,
  reenviarDocumento,
  urlFirmaFirmante,
} from "@/lib/digid";
import {
  sendSignerSigningInstructionsEmail,
  sendSigningFlowNotification,
} from "@/lib/mail/send-transactional";
import { buildCoordinatesForDocumentInOrg } from "@/app/actions/document";
import { digidUserMessage } from "@/lib/digid-user-message";
import { shouldSkipFolioDebitForUserId } from "@/lib/folio-enforcement";
import { folioCreditsForSend, folioReasonForSend } from "@/lib/folio-cost";
import { getDocumentSendReadiness } from "@/lib/document-send-readiness";
import { alignLocalSigningUrlWithRequest } from "@/lib/align-local-signing-url";
import { gateMutation } from "@/lib/gate";

const assignSchema = z.object({
  documentId: z.string().cuid(),
  signatoryIds: z.array(z.string().cuid()).min(1),
});

export type SigningActionState = { ok: boolean; message?: string };

export async function assignSignatoriesToDocument(
  _prev: SigningActionState | null,
  formData: FormData,
): Promise<SigningActionState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const rawIds = formData.get("signatoryIds")?.toString() ?? "";
  const signatoryIds = rawIds.split(",").filter(Boolean);
  const parsed = assignSchema.safeParse({
    documentId: formData.get("documentId"),
    signatoryIds,
  });
  if (!parsed.success) {
    return { ok: false, message: "Selecciona al menos un firmante." };
  }
  const doc = await dbDocumentFindFirstInOrgWithCompany(parsed.data.documentId, orgId);
  if (!doc) return { ok: false, message: "Documento no encontrado." };

  const signs = await dbSignatoryFindManyByIds(parsed.data.signatoryIds, doc.companyId);
  if (!signs.length) return { ok: false, message: "Firmantes no válidos para esta empresa." };

  const kycFor = (signatoryId: string) => formData.get(`kyc_${signatoryId}`) === "1";

  await dbDocumentSignatoryReplace(
    doc.id,
    signs.map((s) => ({ signatoryId: s.id, kyc: kycFor(s.id) })),
  );

  try {
    const res = await asignarFirmantesDocumento({
      IdClient: doc.company.digidIdClient,
      IdDocument: doc.digidDocumentId,
      signatories: signs.map((s) => ({ id: s.digidSignatoryId, kyc: kycFor(s.id) })),
    });
    if (!res.success) {
      return { ok: false, message: res.message ?? "No se pudo asignar en el proveedor." };
    }
    revalidatePath(`/documentos/${doc.id}`);
    return { ok: true, message: "Firmantes asignados." };
  } catch (e) {
    return { ok: false, message: digidUserMessage(e, "No se pudo asignar firmantes en el proveedor.") };
  }
}

const sendSchema = z
  .object({
    documentId: z.string().cuid(),
    typeSign: z.union([z.literal(1), z.literal(2)]),
    folioPremium: z.boolean(),
    colorSign: z.string().optional(),
    remider: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    observerEmail: z.string().optional(),
    observerName: z.string().optional(),
    observerPhone: z.string().optional(),
    observerAprove: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const em = data.observerEmail?.trim();
    if (em && !data.observerName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Si indicas email de observador, el nombre es obligatorio (requisito del proveedor).",
        path: ["observerName"],
      });
    }
  });

export type SendDocumentParsed = z.infer<typeof sendSchema>;

export type SendDocumentCoreOpts = {
  /** Si se omite o es null, no se descuentan folios (p. ej. API con clave). */
  actingUserId?: string | null;
};

async function validateDocumentReadyForSend(
  documentId: string,
  organizationId: string,
): Promise<SigningActionState | null> {
  const r = await getDocumentSendReadiness(documentId, organizationId);
  if (!r.ready) {
    return { ok: false, message: r.message };
  }
  return null;
}

function shouldNotifySignersByEmail(): boolean {
  const v = process.env.JUXA_NOTIFY_SIGNERS?.trim().toLowerCase();
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  const p = (process.env.MAIL_PROVIDER || "none").trim().toLowerCase();
  return p === "resend" || p === "smtp";
}

/** Copia informativa al email del observador (panel Juxa). DIGID ya recibe Observer en la API. */
function shouldSendObserverPanelCopy(): boolean {
  const v = process.env.JUXA_NOTIFY_OBSERVER?.trim().toLowerCase();
  if (v === "0" || v === "false") return false;
  return true;
}

/** Uso interno (API batch / jobs); el llamador debe acotar `organizationId`. */
export async function sendDocumentForSigningCore(
  organizationId: string,
  parsed: SendDocumentParsed,
  opts?: SendDocumentCoreOpts,
): Promise<SigningActionState> {
  const doc = await dbDocumentFindFirstInOrgWithCompany(parsed.documentId, organizationId);
  if (!doc) return { ok: false, message: "Documento no encontrado." };

  const pre = await validateDocumentReadyForSend(doc.id, organizationId);
  if (pre) return pre;

  const coords = await buildCoordinatesForDocumentInOrg(doc.id, organizationId);
  if (!coords) {
    return { ok: false, message: "Agrega al menos una marca de firma en el visor PDF." };
  }

  const actingUserId = opts?.actingUserId ?? null;
  const cost = folioCreditsForSend(parsed.folioPremium);
  const skipFolio = !actingUserId || shouldSkipFolioDebitForUserId(actingUserId);

  if (!skipFolio && actingUserId) {
    const debit = await dbFolioTryDebitForSend({
      userId: actingUserId,
      organizationId,
      cost,
      reason: folioReasonForSend(parsed.folioPremium),
      refType: "document",
      refId: doc.id,
      createdByUserId: actingUserId,
    });
    if (!debit.ok) {
      return { ok: false, message: debit.message };
    }
  }

  const refundFolioIfNeeded = async () => {
    if (skipFolio || !actingUserId) return;
    await dbFolioGrantCredits({
      userId: actingUserId,
      delta: cost,
      reason: "ADJUSTMENT",
      createdByUserId: null,
    });
  };

  const obsEmail = parsed.observerEmail?.trim();
  const obsName = parsed.observerName?.trim();
  const obsPhone = parsed.observerPhone?.trim();

  try {
    const res = await enviarAFirmar({
      IdDoc: doc.digidDocumentId,
      IdClient: doc.company.digidIdClient,
      FolioPremium: parsed.folioPremium,
      TypeSign: parsed.typeSign,
      SignatureCoordinates: coords,
      ColorSign: parsed.colorSign || "#000000",
      Remider: parsed.remider,
      ...(obsEmail
        ? {
            Observer: obsEmail,
            ObserverName: obsName ?? "",
            ...(obsPhone ? { ObserverPhone: obsPhone } : {}),
            ObserverAprove: parsed.observerAprove,
          }
        : {}),
    });
    if (!res.Success) {
      await refundFolioIfNeeded();
      return { ok: false, message: res.Message ?? "El proveedor no aceptó el envío." };
    }
    if (obsEmail && shouldSendObserverPanelCopy()) {
      const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
      const panelUrl = base ? `${base}/documentos/${doc.id}` : `/documentos/${doc.id}`;
      const mailRes = await sendSigningFlowNotification({
        to: [obsEmail],
        documentName: doc.nameDoc,
        panelUrl,
        summary:
          "El documento se envió a firmar en DIGID. Este correo es una copia informativa desde Juxa Sign (no sustituye las notificaciones del proveedor a los firmantes).",
      });
      if (!mailRes.ok && process.env.JUXA_MAIL_REQUIRED === "1") {
        await refundFolioIfNeeded();
        return { ok: false, message: mailRes.error };
      }
    }

    if (shouldNotifySignersByEmail()) {
      const withLinks = await dbDocumentFindFirstWithCompanyAndSignatoryLinks(doc.id, organizationId);
      if (withLinks && "signatories" in withLinks) {
        type LinkRow = {
          signatory: { digidSignatoryId: number; name: string; email: string | null };
        };
        const d = withLinks as typeof withLinks & { signatories: LinkRow[]; nameDoc: string };
        for (const link of d.signatories) {
          const email = link.signatory.email?.trim();
          if (!email) continue;
          const urlRes = await urlFirmaFirmante({
            IdCliente: d.company.digidIdClient,
            IdDocumento: d.digidDocumentId,
            IdFirmante: link.signatory.digidSignatoryId,
          });
          const extra = urlRes.ExtraInfo as { URL?: string } | undefined;
          const url = Number(urlRes.Codigo) === 200 && extra?.URL ? extra.URL : null;
          if (!url) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[mail:signer-skip] sin URL de firma para", email, urlRes);
            }
            continue;
          }
          const signingUrlForEmail = await alignLocalSigningUrlWithRequest(url);
          const signerMail = await sendSignerSigningInstructionsEmail({
            to: email,
            recipientName: link.signatory.name,
            documentName: d.nameDoc,
            signingUrl: signingUrlForEmail,
          });
          if (!signerMail.ok && process.env.NODE_ENV !== "production") {
            console.warn("[mail:signer]", signerMail.error);
          }
        }
      }
    }

    revalidatePath(`/documentos/${doc.id}`);
    revalidatePath("/envios");
    return { ok: true, message: "Documento enviado a firmar." };
  } catch (e) {
    await refundFolioIfNeeded();
    return { ok: false, message: digidUserMessage(e) };
  }
}

export async function sendDocumentForSigning(
  _prev: SigningActionState | null,
  formData: FormData,
): Promise<SigningActionState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const typeRaw = Number(formData.get("typeSign"));
  const remRaw = Number(formData.get("remider"));
  const remider = remRaw === 2 ? 2 : remRaw === 3 ? 3 : 1;
  const parsed = sendSchema.safeParse({
    documentId: formData.get("documentId"),
    typeSign: typeRaw === 2 ? 2 : 1,
    /** Siempre premium / NOM-151 en envío manual (UI ya no expone la opción). */
    folioPremium: true,
    colorSign: formData.get("colorSign")?.toString() || undefined,
    remider,
    observerEmail: formData.get("observerEmail")?.toString(),
    observerName: formData.get("observerName")?.toString(),
    observerPhone: formData.get("observerPhone")?.toString(),
    observerAprove: formData.get("observerAprove") === "on",
  });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.observerName?.[0];
    return { ok: false, message: msg ?? "Datos de envío inválidos." };
  }

  return sendDocumentForSigningCore(orgId, parsed.data, { actingUserId: g.session.user.id });
}

/** API / jobs: envío con opciones por defecto. Sin `actingUserId` no hay descuento de cartera (API clave). */
export async function sendDocumentForSigningDefaults(
  organizationId: string,
  documentId: string,
  actingUserId?: string | null,
) {
  const parsed = sendSchema.parse({
    documentId,
    typeSign: 1,
    folioPremium: false,
    colorSign: "#000000",
    remider: 1,
    observerAprove: false,
  });
  return sendDocumentForSigningCore(organizationId, parsed, { actingUserId: actingUserId ?? null });
}

function csvCell(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

export async function buildSignerUrlsCsvForOrg(
  organizationId: string,
  documentId: string,
): Promise<{ ok: true; csv: string; fileName: string } | { ok: false; message: string }> {
  const raw = await dbDocumentFindFirstWithCompanyAndSignatoryLinks(documentId, organizationId);
  if (!raw || !("signatories" in raw)) {
    return { ok: false, message: "Documento no encontrado." };
  }
  type LinkRow = { signatory: { digidSignatoryId: number; name: string; email: string | null } };
  const doc = raw as typeof raw & { signatories: LinkRow[]; nameDoc: string };
  const lines = ["firmante,email,url"];
  for (const link of doc.signatories) {
    const res = await urlFirmaFirmante({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
      IdFirmante: link.signatory.digidSignatoryId,
    });
    const extra = res.ExtraInfo as { URL?: string } | undefined;
    const url = Number(res.Codigo) === 200 && extra?.URL ? extra.URL : "";
    lines.push(
      [csvCell(link.signatory.name), csvCell(link.signatory.email ?? ""), csvCell(url)].join(","),
    );
  }
  const safeName = doc.nameDoc.replace(/[^\w.-]+/g, "_").slice(0, 60);
  return { ok: true, csv: lines.join("\n"), fileName: `urls-firma-${safeName}.csv` };
}

export async function exportSignerUrlsCsv(documentId: string) {
  const g = await gateMutation();
  if (!g.ok) return { ok: false as const, message: g.message };
  return buildSignerUrlsCsvForOrg(g.session.user.organizationId, documentId);
}

export async function getBulkSignerUrls(documentId: string) {
  const g = await gateMutation();
  if (!g.ok)
    return { ok: false as const, message: g.message, urls: [] as { name: string; url: string; signatoryId: string }[] };
  const orgId = g.session.user.organizationId;

  const raw = await dbDocumentFindFirstWithCompanyAndSignatoryLinks(documentId, orgId);
  if (!raw || !("signatories" in raw)) {
    return { ok: false as const, message: "No encontrado", urls: [] as { name: string; url: string; signatoryId: string }[] };
  }

  type LinkRow = { signatoryId: string; signatory: { digidSignatoryId: number; name: string } };
  const doc = raw as typeof raw & { signatories: LinkRow[] };
  const links = doc.signatories;

  const urls: { name: string; url: string; signatoryId: string }[] = [];
  for (const link of links) {
    const res = await urlFirmaFirmante({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
      IdFirmante: link.signatory.digidSignatoryId,
    });
    const extra = res.ExtraInfo as { URL?: string } | undefined;
    if (Number(res.Codigo) === 200 && extra?.URL) {
      urls.push({ name: link.signatory.name, url: extra.URL, signatoryId: link.signatoryId });
    }
  }
  return { ok: true as const, urls };
}

export async function getLayoutSignerUrl(documentId: string) {
  const g = await gateMutation();
  if (!g.ok) return { ok: false as const, message: g.message };
  const orgId = g.session.user.organizationId;

  const doc = await dbDocumentFindFirstInOrgWithCompany(documentId, orgId);
  if (!doc) return { ok: false as const, message: "No encontrado" };
  const res = await obtenerUrlFirmaDocumento({
    IdCliente: doc.company.digidIdClient,
    IdDocumento: doc.digidDocumentId,
  });
  const extra = res.ExtraInfo as { URL?: string } | undefined;
  const code = Number(res.Codigo);
  if (code !== 200 || !extra?.URL) {
    return { ok: false as const, message: "No se pudo obtener URL de firma." };
  }
  return { ok: true as const, url: extra.URL };
}

export async function reenviarSigningInvite(documentId: string, signatoryId: string): Promise<SigningActionState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const raw = await dbDocumentFindFirstWithCompanyAndSignatoryLinks(documentId, orgId);
  if (!raw || !("signatories" in raw)) return { ok: false, message: "Documento no encontrado." };
  type LinkRow = { signatoryId: string; signatory: { digidSignatoryId: number; name: string } };
  const doc = raw as typeof raw & { signatories: LinkRow[] };
  const link = doc.signatories.find((s) => s.signatoryId === signatoryId);
  if (!link) return { ok: false, message: "Ese firmante no está asignado a este documento." };

  try {
    const res = await reenviarDocumento({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
      IdFirmante: link.signatory.digidSignatoryId,
    });
    const code = Number(res.Codigo);
    if (code !== 200) {
      const desc = (res.ExtraInfo as { Descripcion?: string } | undefined)?.Descripcion;
      return { ok: false, message: desc ?? "El proveedor no pudo reenviar la invitación." };
    }
    revalidatePath(`/documentos/${doc.id}/enviar`);
    return { ok: true, message: `Invitación reenviada a ${link.signatory.name}.` };
  } catch (e) {
    return { ok: false, message: digidUserMessage(e, "No se pudo reenviar la invitación.") };
  }
}
