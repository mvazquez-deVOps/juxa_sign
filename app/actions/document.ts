"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCompanyFindFirstInOrg,
  dbDocumentCreate,
  dbDocumentFindFirstInOrgWithCompany,
  dbDocumentFindFirstWithPlacementsAndSignatories,
  dbDocumentFindFirstInOrgSelectId,
  dbDocumentTouchLastStatusSync,
  dbDocumentUpdateStatus,
  dbDocumentsFindManyForSync,
  dbPlacementCreate,
  dbPlacementDeleteManyForDocument,
  dbPlacementsReorder,
} from "@/lib/data/repository";
import {
  buildSignatureCoordinatesJson,
  crearDocumentoMultipart,
  infoDocumento,
  type SignatureCoordinate,
} from "@/lib/digid";
import { digidUserMessage } from "@/lib/digid-user-message";
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

export async function addPlacement(formData: FormData) {
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

export async function clearPlacements(documentId: string) {
  const g = await gateMutation();
  if (!g.ok) return;
  const orgId = g.session.user.organizationId;
  const doc = await dbDocumentFindFirstInOrgSelectId(documentId, orgId);
  if (!doc) return;
  await dbPlacementDeleteManyForDocument(documentId);
  revalidatePath(`/documentos/${documentId}`);
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
