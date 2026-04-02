"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  asignarFirmantesDocumento,
  enviarAFirmar,
  obtenerUrlFirmaDocumento,
  urlFirmaFirmante,
} from "@/lib/digid";
import { buildCoordinatesForDocument } from "@/app/actions/document";

const assignSchema = z.object({
  documentId: z.string().cuid(),
  signatoryIds: z.array(z.string().cuid()).min(1),
  kyc: z.boolean(),
});

export type SigningActionState = { ok: boolean; message?: string };

export async function assignSignatoriesToDocument(
  _prev: SigningActionState | null,
  formData: FormData,
): Promise<SigningActionState> {
  const rawIds = formData.get("signatoryIds")?.toString() ?? "";
  const signatoryIds = rawIds.split(",").filter(Boolean);
  const parsed = assignSchema.safeParse({
    documentId: formData.get("documentId"),
    signatoryIds,
    kyc: formData.get("kyc") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Selecciona al menos un firmante." };
  }
  const doc = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    include: { company: true },
  });
  if (!doc) return { ok: false, message: "Documento no encontrado." };

  const signs = await prisma.signatory.findMany({
    where: { id: { in: parsed.data.signatoryIds }, companyId: doc.companyId },
  });
  if (!signs.length) return { ok: false, message: "Firmantes no válidos para esta empresa." };

  await prisma.documentSignatory.deleteMany({ where: { documentId: doc.id } });
  await prisma.documentSignatory.createMany({
    data: signs.map((s) => ({
      documentId: doc.id,
      signatoryId: s.id,
      kyc: parsed.data.kyc,
    })),
  });

  try {
    const res = await asignarFirmantesDocumento({
      IdClient: doc.company.digidIdClient,
      IdDocument: doc.digidDocumentId,
      signatories: signs.map((s) => ({ id: s.digidSignatoryId, kyc: parsed.data.kyc })),
    });
    if (!res.success) {
      return { ok: false, message: res.message ?? "No se pudo asignar en DIGID." };
    }
    revalidatePath(`/documentos/${doc.id}`);
    return { ok: true, message: "Firmantes asignados." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return { ok: false, message: msg };
  }
}

const sendSchema = z.object({
  documentId: z.string().cuid(),
  typeSign: z.union([z.literal(1), z.literal(2)]),
  folioPremium: z.boolean(),
  colorSign: z.string().optional(),
  /** DIGID send_doc · 1 = 24 h, 2 = 48 h, 3 = 72 h */
  remider: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function sendDocumentForSigning(
  _prev: SigningActionState | null,
  formData: FormData,
): Promise<SigningActionState> {
  const typeRaw = Number(formData.get("typeSign"));
  const remRaw = Number(formData.get("remider"));
  const remider = remRaw === 2 ? 2 : remRaw === 3 ? 3 : 1;
  const parsed = sendSchema.safeParse({
    documentId: formData.get("documentId"),
    typeSign: typeRaw === 2 ? 2 : 1,
    folioPremium: formData.get("folioPremium") === "on",
    colorSign: formData.get("colorSign")?.toString() || undefined,
    remider,
  });
  if (!parsed.success) return { ok: false, message: "Datos de envío inválidos." };

  const doc = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    include: { company: true },
  });
  if (!doc) return { ok: false, message: "Documento no encontrado." };

  const coords = await buildCoordinatesForDocument(doc.id);
  if (!coords) {
    return { ok: false, message: "Agrega al menos una marca de firma en el visor PDF." };
  }

  try {
    const res = await enviarAFirmar({
      IdDoc: doc.digidDocumentId,
      IdClient: doc.company.digidIdClient,
      FolioPremium: parsed.data.folioPremium,
      TypeSign: parsed.data.typeSign,
      SignatureCoordinates: coords,
      ColorSign: parsed.data.colorSign || "#000000",
      Remider: parsed.data.remider,
    });
    if (!res.Success) {
      return { ok: false, message: res.Message ?? "DIGID no aceptó el envío." };
    }
    revalidatePath(`/documentos/${doc.id}`);
    return { ok: true, message: "Documento enviado a firmar." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return { ok: false, message: msg };
  }
}

export async function getBulkSignerUrls(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
    },
  });
  if (!doc) return { ok: false as const, message: "No encontrado", urls: [] as { name: string; url: string }[] };

  const urls: { name: string; url: string }[] = [];
  for (const link of doc.signatories) {
    const res = await urlFirmaFirmante({
      IdCliente: doc.company.digidIdClient,
      IdDocumento: doc.digidDocumentId,
      IdFirmante: link.signatory.digidSignatoryId,
    });
    const extra = res.ExtraInfo as { URL?: string } | undefined;
    if (Number(res.Codigo) === 200 && extra?.URL) {
      urls.push({ name: link.signatory.name, url: extra.URL });
    }
  }
  return { ok: true as const, urls };
}

export async function getLayoutSignerUrl(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { company: true },
  });
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
