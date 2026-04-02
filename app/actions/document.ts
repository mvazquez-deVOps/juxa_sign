"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildSignatureCoordinatesJson,
  crearDocumentoMultipart,
  infoDocumento,
  type SignatureCoordinate,
} from "@/lib/digid";

const uploadSchema = z.object({
  companyId: z.string().cuid(),
  nameDoc: z.string().min(1).max(100),
});

export type DocumentUploadState = { ok: boolean; message?: string; documentId?: string };

export async function uploadDocument(
  _prev: DocumentUploadState | null,
  formData: FormData,
): Promise<DocumentUploadState> {
  const file = formData.get("file") as File | null;
  const parsed = uploadSchema.safeParse({
    companyId: formData.get("companyId"),
    nameDoc: formData.get("nameDoc"),
  });
  if (!parsed.success || !file || file.size === 0) {
    return { ok: false, message: "Selecciona un PDF y completa los datos." };
  }
  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) return { ok: false, message: "Empresa no encontrada." };

  const fd = new FormData();
  fd.set("NameDoc", parsed.data.nameDoc);
  fd.set("IdClient", String(company.digidIdClient));
  fd.set("UseTemplate", "false");
  fd.set("FileDoc", file);

  try {
    const res = await crearDocumentoMultipart(fd);
    if (!res.Success || !res.Data?.IdDocumento) {
      return { ok: false, message: res.Message ?? "No se pudo crear el documento." };
    }
    const doc = await prisma.document.create({
      data: {
        companyId: company.id,
        digidDocumentId: res.Data.IdDocumento,
        nameDoc: parsed.data.nameDoc,
        urlDocumento: res.Data.UrlDocumento ?? null,
      },
    });
    revalidatePath("/documentos");
    return { ok: true, message: "Documento creado.", documentId: doc.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}

export async function refreshDocumentStatus(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { company: true },
  });
  if (!doc) return { ok: false as const, message: "No encontrado" };
  try {
    const res = await infoDocumento({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
    });
    if (Number(res.Codigo) === 200 && res.ExtraInfo && typeof res.ExtraInfo === "object") {
      const info = res.ExtraInfo as { estado?: string };
      const estado = info.estado;
      if (estado) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: estado },
        });
      }
    }
    revalidatePath(`/documentos/${documentId}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "Error DIGID" };
  }
}

const SYNC_STATUS_LIMIT = 100;

/** Polling masivo (Sprint 5): útil sin webhook o para forzar actualización. */
export async function syncDocumentsStatusBulk(): Promise<string> {
  const docs = await prisma.document.findMany({
    include: { company: true },
    orderBy: { updatedAt: "desc" },
    take: SYNC_STATUS_LIMIT,
  });
  let ok = 0;
  let fail = 0;
  for (const doc of docs) {
    const r = await refreshDocumentStatus(doc.id);
    if (r.ok) ok++;
    else fail++;
  }
  revalidatePath("/envios");
  revalidatePath("/documentos");
  return `Actualizados ${ok} de ${docs.length} documentos (${fail} sin confirmar de DIGID).`;
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
  await prisma.signaturePlacement.create({
    data: {
      documentId: parsed.data.documentId,
      signatoryId: parsed.data.signatoryId,
      page: parsed.data.page,
      x: parsed.data.x,
      y: parsed.data.y,
      widthPx: parsed.data.widthPx,
      heightPx: parsed.data.heightPx,
    },
  });
  revalidatePath(`/documentos/${parsed.data.documentId}`);
  return { ok: true };
}

export async function clearPlacements(documentId: string) {
  await prisma.signaturePlacement.deleteMany({ where: { documentId } });
  revalidatePath(`/documentos/${documentId}`);
}

export async function buildCoordinatesForDocument(documentId: string): Promise<string | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      placements: { include: { signatory: true } },
    },
  });
  if (!doc?.placements.length) return null;
  const items: SignatureCoordinate[] = doc.placements.map((p) => ({
    x: p.x,
    y: p.y,
    firmante: p.signatory.digidSignatoryId,
    nombre: p.signatory.name,
    pagina: p.page,
    altoPagina: p.heightPx,
    AnchoPagina: p.widthPx,
    xDoc: p.x,
    yDoc: p.y,
    position: 0,
  }));
  return buildSignatureCoordinatesJson(items);
}
