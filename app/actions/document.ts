"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCompanyFindFirstInOrg,
  dbDocumentCreate,
  dbDocumentFindFirstInOrgWithCompany,
  dbDocumentFindFirstWithPlacementsAndSignatories,
  dbDocumentFindFirstInOrgSelectId,
  dbDocumentCancelWithLedgerRefunds,
  dbDocumentSignatoryReplace,
  dbDocumentTouchLastStatusSync,
  dbDocumentUpdateStatus,
  dbDocumentsFindManyForSync,
  dbLedgerDocumentSendAndKycDebitAggregates,
  dbFindDocumentDetailInOrg,
  dbPlacementCreate,
  dbPlacementDeleteById,
  dbPlacementDeleteManyForDocument,
  dbPlacementUpdateGeometry,
  dbPlacementsReorder,
} from "@/lib/data/repository";
import {
  buildSignatureCoordinatesJson,
  cancelarDocumento,
  crearDocumentoMultipart,
  digidCertifyNom151Form,
  infoDocumento,
  parseDigidBearerResult,
  type SignatureCoordinate,
} from "@/lib/digid";
import { digidUserMessage } from "@/lib/digid-user-message";
import { isDocumentCancelBlocked, isDocumentCompleted } from "@/lib/document-cancel-policy";
import {
  gateDocumentStatusSync,
  gateMutation,
  gateOrgStructureMutation,
  requireOrgSession,
} from "@/lib/gate";

const uploadSchema = z.object({
  companyId: z.string().trim().min(1, "Elige un cliente."),
  nameDoc: z.string().min(1).max(100),
});

export type DocumentUploadState = { ok: boolean; message?: string; documentId?: string };

export async function uploadDocument(
  _prev: DocumentUploadState | null,
  formData: FormData,
): Promise<DocumentUploadState> {
  const g = await gateOrgStructureMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const file = formData.get("file");
  const parsed = uploadSchema.safeParse({
    companyId: formData.get("companyId"),
    nameDoc: formData.get("nameDoc"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: fe.companyId?.[0] ?? fe.nameDoc?.[0] ?? "Revisa cliente y nombre del documento.",
    };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecciona un archivo PDF (el archivo no llegó al servidor o está vacío)." };
  }
  const company = await dbCompanyFindFirstInOrg(parsed.data.companyId, orgId);
  if (!company) {
    return {
      ok: false,
      message:
        "Cliente no encontrado en tu organización. Vuelve a elegir el cliente en la lista o recarga la página por si la sesión y los datos no coinciden.",
    };
  }

  const fd = new FormData();
  fd.set("NameDoc", parsed.data.nameDoc);
  fd.set("IdClient", String(company.digidIdClient));
  fd.set("UseTemplate", "0");
  fd.set("FileDoc", file);

  try {
    const res = await crearDocumentoMultipart(fd);
    if (!res.Success || res.Data?.IdDocumento == null) {
      return { ok: false, message: res.Message ?? "No se pudo crear el documento." };
    }
    const doc = await dbDocumentCreate({
      companyId: company.id,
      digidDocumentId: res.Data.IdDocumento,
      nameDoc: parsed.data.nameDoc,
      urlDocumento: res.Data.UrlDocumento ?? null,
    });
    revalidatePath("/documentos");
    revalidatePath(`/documentos/${doc.id}`);
    return { ok: true, message: "Documento creado.", documentId: doc.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}

export async function refreshDocumentStatus(documentId: string) {
  const g = await gateDocumentStatusSync();
  if (!g.ok) return { ok: false as const, message: g.message };
  const orgId = g.session.user.organizationId;

  const doc = await dbDocumentFindFirstInOrgWithCompany(documentId, orgId);
  if (!doc) return { ok: false as const, message: "No encontrado" };
  try {
    const res = await infoDocumento({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
    });
    const code = Number(res.Codigo);
    if (code === 200 && res.ExtraInfo && typeof res.ExtraInfo === "object") {
      const info = res.ExtraInfo as { estado?: string };
      const estado = info.estado;
      const now = new Date();
      if (estado) {
        await dbDocumentUpdateStatus(doc.id, estado, now);
      } else {
        await dbDocumentTouchLastStatusSync(doc.id, now);
      }
    }
    revalidatePath(`/documentos/${documentId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: digidUserMessage(e, "Error al consultar el estado en el proveedor.") };
  }
}

const SYNC_STATUS_LIMIT = 100;

export async function syncDocumentsStatusBulk(): Promise<string> {
  const g = await gateDocumentStatusSync();
  if (!g.ok) return g.message;
  const orgId = g.session.user.organizationId;

  const docs = await dbDocumentsFindManyForSync(orgId, SYNC_STATUS_LIMIT);
  let ok = 0;
  let fail = 0;
  for (const doc of docs) {
    const r = await refreshDocumentStatus(doc.id);
    if (r.ok) ok++;
    else fail++;
  }
  revalidatePath("/envios");
  revalidatePath("/documentos");
  return `Actualizados ${ok} de ${docs.length} documentos (${fail} sin confirmar en el proveedor).`;
}

const idListSchema = z.array(z.string().cuid()).max(50);

export async function syncDocumentsStatusForIds(documentIds: string[]): Promise<string> {
  const g = await gateDocumentStatusSync();
  if (!g.ok) return g.message;
  const orgId = g.session.user.organizationId;
  const parsed = idListSchema.safeParse(documentIds);
  if (!parsed.success) return "Selección inválida (máx. 50 documentos).";

  let ok = 0;
  let fail = 0;
  for (const id of parsed.data) {
    const doc = await dbDocumentFindFirstInOrgSelectId(id, orgId);
    if (!doc) continue;
    const r = await refreshDocumentStatus(id);
    if (r.ok) ok++;
    else fail++;
  }
  revalidatePath("/envios");
  revalidatePath("/documentos");
  return `Actualizados ${ok} de ${parsed.data.length} seleccionados (${fail} sin confirmar en el proveedor).`;
}

const placementSchema = z.object({
  documentId: z.string().cuid(),
  signatoryId: z.string().cuid(),
  page: z.coerce.number().int().min(1),
  x: z.coerce.number(),
  y: z.coerce.number(),
  widthPx: z.coerce.number(),
  heightPx: z.coerce.number(),
});

export async function addPlacement(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const parsed = placementSchema.safeParse({
    documentId: formData.get("documentId"),
    signatoryId: formData.get("signatoryId"),
    page: formData.get("page"),
    x: formData.get("x"),
    y: formData.get("y"),
    widthPx: formData.get("widthPx"),
    heightPx: formData.get("heightPx"),
  });
  if (!parsed.success) return { ok: false, message: "Datos de marca inválidos." };

  const doc = await dbDocumentFindFirstInOrgSelectId(parsed.data.documentId, orgId);
  if (!doc) return { ok: false, message: "Documento no encontrado." };

  await dbPlacementCreate({
    documentId: parsed.data.documentId,
    signatoryId: parsed.data.signatoryId,
    page: parsed.data.page,
    x: parsed.data.x,
    y: parsed.data.y,
    widthPx: parsed.data.widthPx,
    heightPx: parsed.data.heightPx,
  });
  revalidatePath(`/documentos/${parsed.data.documentId}`);
  return { ok: true };
}

export async function clearPlacements(documentId: string): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;
  const doc = await dbDocumentFindFirstInOrgSelectId(documentId, orgId);
  if (!doc) return { ok: false, message: "Documento no encontrado." };
  await dbPlacementDeleteManyForDocument(documentId);
  revalidatePath(`/documentos/${documentId}`);
  return { ok: true };
}

/** Reemplaza `DocumentSignatory` por los firmantes que tienen al menos una marca en el PDF. */
export async function syncDocumentSignatoriesFromPlacements(
  documentId: string,
): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;
  const doc = await dbFindDocumentDetailInOrg(documentId, orgId);
  if (!doc) return { ok: false, message: "Documento no encontrado." };
  const ids = [...new Set(doc.placements.map((p) => p.signatoryId))];
  await dbDocumentSignatoryReplace(
    documentId,
    ids.map((signatoryId) => ({ signatoryId, kyc: false })),
  );
  revalidatePath(`/documentos/${documentId}`);
  revalidatePath(`/documentos/${documentId}/enviar`);
  return {
    ok: true,
    message:
      ids.length > 0
        ? `Listo: ${ids.length} firmante(s) vinculado(s) al documento según las marcas del PDF.`
        : "Sin marcas en el PDF: se vació la lista de firmantes asignados al documento.",
  };
}

const removePlacementSchema = z.object({
  documentId: z.string().cuid(),
  placementId: z.string().cuid(),
});

export async function removePlacement(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;
  const parsed = removePlacementSchema.safeParse({
    documentId: formData.get("documentId"),
    placementId: formData.get("placementId"),
  });
  if (!parsed.success) return { ok: false, message: "Datos de marca inválidos." };
  const ok = await dbPlacementDeleteById(parsed.data.placementId, orgId);
  if (!ok) return { ok: false, message: "Marca no encontrada o sin permiso." };
  revalidatePath(`/documentos/${parsed.data.documentId}`);
  return { ok: true };
}

const updatePlacementGeometrySchema = z.object({
  documentId: z.string().cuid(),
  placementId: z.string().cuid(),
  page: z.coerce.number().int().min(1),
  x: z.coerce.number(),
  y: z.coerce.number(),
  widthPx: z.coerce.number(),
  heightPx: z.coerce.number(),
});

export async function updatePlacementGeometry(
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;
  const parsed = updatePlacementGeometrySchema.safeParse({
    documentId: formData.get("documentId"),
    placementId: formData.get("placementId"),
    page: formData.get("page"),
    x: formData.get("x"),
    y: formData.get("y"),
    widthPx: formData.get("widthPx"),
    heightPx: formData.get("heightPx"),
  });
  if (!parsed.success) return { ok: false, message: "Datos de marca inválidos." };
  const ok = await dbPlacementUpdateGeometry(
    parsed.data.placementId,
    parsed.data.documentId,
    orgId,
    {
      page: parsed.data.page,
      x: parsed.data.x,
      y: parsed.data.y,
      widthPx: parsed.data.widthPx,
      heightPx: parsed.data.heightPx,
    },
  );
  if (!ok) return { ok: false, message: "No se pudo actualizar la marca." };
  revalidatePath(`/documentos/${parsed.data.documentId}`);
  return { ok: true };
}

/** Sin sesión: usar solo desde rutas que ya validaron `organizationId`. */
export async function buildCoordinatesForDocumentInOrg(
  documentId: string,
  organizationId: string,
): Promise<string | null> {
  const doc = await dbDocumentFindFirstWithPlacementsAndSignatories(documentId, organizationId);
  if (!doc || !("placements" in doc) || !doc.placements.length) return null;
  const items: SignatureCoordinate[] = doc.placements.map((p, index) => ({
    x: p.x,
    y: p.y,
    firmante: p.signatory.digidSignatoryId,
    nombre: p.signatory.name,
    pagina: p.page,
    altoPagina: p.heightPx,
    AnchoPagina: p.widthPx,
    xDoc: p.x,
    ydoc: p.y,
    position: index,
  }));
  return buildSignatureCoordinatesJson(items);
}

export type PlacementReorderState = { ok: boolean; message?: string };

export async function reorderDocumentPlacements(
  documentId: string,
  orderedIds: string[],
): Promise<PlacementReorderState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const r = await dbPlacementsReorder(documentId, g.session.user.organizationId, orderedIds);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/documentos/${documentId}`);
  revalidatePath(`/documentos/${documentId}/enviar`);
  return { ok: true, message: "Orden de firmas actualizado." };
}

export async function buildCoordinatesForDocument(documentId: string): Promise<string | null> {
  const g = await gateMutation();
  if (!g.ok) return null;
  return buildCoordinatesForDocumentInOrg(documentId, g.session.user.organizationId);
}

const documentIdSchema = z.string().cuid();

/**
 * Cancela el documento en DIGID si hubo envío cobrado en folios, marca `CANCELED` y reembolsa folios/KYC según el ledger.
 */
export async function cancelDocumentAction(
  documentId: string,
): Promise<{ ok: boolean; message?: string }> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;
  const actingUserId = g.session.user.id;

  const parsed = documentIdSchema.safeParse(documentId);
  if (!parsed.success) {
    return { ok: false, message: "Identificador de documento inválido." };
  }

  const doc = await dbDocumentFindFirstInOrgWithCompany(parsed.data, orgId);
  if (!doc) {
    return { ok: false, message: "Documento no encontrado." };
  }

  if (isDocumentCancelBlocked(doc.status)) {
    return { ok: false, message: "Este documento ya está completado o cancelado." };
  }

  const { folio: folioRefunds, kyc: kycRefunds } = await dbLedgerDocumentSendAndKycDebitAggregates(
    parsed.data,
    orgId,
  );
  const hadSendDebit = folioRefunds.some((r) => r.credits > 0);

  if (hadSendDebit) {
    try {
      const digid = await cancelarDocumento({
        IdCliente: doc.company.digidIdClient,
        IdDocumento: doc.digidDocumentId,
      });
      if (!digid.ok) {
        return { ok: false, message: digid.message };
      }
    } catch (e) {
      return { ok: false, message: digidUserMessage(e, "No se pudo cancelar el documento en el proveedor.") };
    }
  }

  const persist = await dbDocumentCancelWithLedgerRefunds({
    documentId: parsed.data,
    organizationId: orgId,
    folioRefunds,
    kycRefunds,
    createdByUserId: actingUserId ?? null,
  });
  if (!persist.ok) {
    return { ok: false, message: persist.message };
  }

  revalidatePath("/envios");
  revalidatePath("/documentos");
  revalidatePath(`/documentos/${parsed.data}`);
  revalidatePath(`/documentos/${parsed.data}/enviar`);
  return { ok: true, message: "Documento cancelado. Se reembolsaron los créditos aplicables." };
}

function safeConstanciaFileBase(name: string): string {
  const t = name.trim().replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]+/g, "_").slice(0, 80);
  return t || "documento";
}

async function fetchStoredDocumentPdf(url: string): Promise<Buffer> {
  const token = process.env.DIGID_TOKEN?.trim();
  const pdfRes = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!pdfRes.ok) {
    throw new Error(`No se pudo descargar el PDF del documento (HTTP ${pdfRes.status}).`);
  }
  return Buffer.from(await pdfRes.arrayBuffer());
}

export type DownloadConstanciaResult =
  | { ok: true; pdfBase64: string; fileName: string }
  | { ok: false; message: string };

/**
 * Genera constancia NOM-151 vía DIGID `certify_doc` y devuelve el PDF en base64 para descarga en el cliente.
 * Cualquier miembro de la org con sesión (incl. VIEWER) puede descargar si el documento está completado.
 */
export async function downloadConstanciaAction(documentId: string): Promise<DownloadConstanciaResult> {
  const g = await requireOrgSession();
  if (!g.ok) return { ok: false, message: g.message };

  const orgId = g.session.user.organizationId;
  const parsed = documentIdSchema.safeParse(documentId);
  if (!parsed.success) {
    return { ok: false, message: "Identificador de documento inválido." };
  }

  const doc = await dbDocumentFindFirstInOrgWithCompany(parsed.data, orgId);
  if (!doc) {
    return { ok: false, message: "Documento no encontrado." };
  }

  if (!isDocumentCompleted(doc.status)) {
    return {
      ok: false,
      message: "La constancia NOM-151 solo está disponible cuando el documento está firmado (estado completado).",
    };
  }

  if (!doc.urlDocumento?.trim()) {
    return { ok: false, message: "El documento no tiene URL de PDF para certificar." };
  }

  try {
    const pdfBuf = await fetchStoredDocumentPdf(doc.urlDocumento.trim());
    const cert = await digidCertifyNom151Form(doc.company.digidIdClient, pdfBuf, doc.nameDoc);

    if (cert.responseType === "json") {
      const body = cert.body as Record<string, unknown>;
      const { ok: digidOk, message: digidMsg } = parseDigidBearerResult(body);
      if (!digidOk) {
        return { ok: false, message: digidMsg ?? "El proveedor rechazó la certificación." };
      }
      return {
        ok: false,
        message:
          digidMsg ??
          "El proveedor aceptó la solicitud pero no devolvió PDF en esta respuesta. Revisa el manual del endpoint o el panel DIGID.",
      };
    }

    const base = safeConstanciaFileBase(doc.nameDoc);
    return {
      ok: true,
      pdfBase64: Buffer.from(cert.buffer).toString("base64"),
      fileName: `Constancia-NOM151-${base}.pdf`,
    };
  } catch (e) {
    return { ok: false, message: digidUserMessage(e, "No se pudo generar la constancia.") };
  }
}
