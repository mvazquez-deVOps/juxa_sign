"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendDocumentForSigningCore, type SendDocumentParsed } from "@/app/actions/signing";
import {
  dbCompanyFindFirstInOrg,
  dbDocumentCreate,
  dbDocumentSignatoryReplace,
  dbPlacementCreate,
  dbSignatoryUpsert,
} from "@/lib/data/repository";
import { asignarFirmantesDocumento, crearDocumentoMultipart, guardarFirmante } from "@/lib/digid";
import { gateOrgStructureMutation } from "@/lib/gate";
import { resolveSession } from "@/lib/session";
import { isSuperadminSigningLabEnabled } from "@/lib/superadmin-signing-lab";

const schema = z.object({
  companyId: z.string().cuid(),
  nameDoc: z.string().min(1).max(100),
  signerName: z.string().min(2).max(120),
  signerEmail: z.string().email(),
});

/** Marca por defecto (pág. 1, zona inferior) para pruebas sin abrir el visor. */
const LAB_PLACEMENT = {
  page: 1,
  x: 320,
  y: 620,
  widthPx: 612,
  heightPx: 792,
} as const;

export type SuperadminSigningLabState = {
  ok: boolean;
  message?: string;
  documentId?: string;
};

export async function runSuperadminSigningLab(
  _prev: SuperadminSigningLabState | null,
  formData: FormData,
): Promise<SuperadminSigningLabState> {
  if (!isSuperadminSigningLabEnabled()) {
    return {
      ok: false,
      message:
        "Este laboratorio solo está disponible en desarrollo o con JUXA_SUPERADMIN_SIGNING_LAB=1 en el servidor.",
    };
  }

  const session = await resolveSession();
  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.organizationId || !session.user.id) {
    return { ok: false, message: "Se requiere sesión de plataforma (superadmin)." };
  }

  const g = await gateOrgStructureMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const file = formData.get("file");
  const parsed = schema.safeParse({
    companyId: formData.get("companyId"),
    nameDoc: formData.get("nameDoc"),
    signerName: formData.get("signerName"),
    signerEmail: formData.get("signerEmail"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa cliente, nombre del documento, nombre y correo del firmante." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecciona un archivo PDF." };
  }
  const mime = (file.type || "").toLowerCase();
  const nameLower = file.name.toLowerCase();
  if (mime !== "application/pdf" && !nameLower.endsWith(".pdf")) {
    return { ok: false, message: "El archivo debe ser PDF." };
  }

  const company = await dbCompanyFindFirstInOrg(parsed.data.companyId, orgId);
  if (!company) {
    return { ok: false, message: "Cliente no encontrado en tu organización." };
  }

  const fd = new FormData();
  fd.set("NameDoc", parsed.data.nameDoc);
  fd.set("IdClient", String(company.digidIdClient));
  fd.set("UseTemplate", "false");
  fd.set("FileDoc", file);

  let docId: string;
  let digidDocumentId: number;
  try {
    const res = await crearDocumentoMultipart(fd);
    if (!res.Success || res.Data?.IdDocumento == null) {
      return { ok: false, message: res.Message ?? "No se pudo crear el documento en el proveedor." };
    }
    const doc = await dbDocumentCreate({
      companyId: company.id,
      digidDocumentId: res.Data.IdDocumento,
      nameDoc: parsed.data.nameDoc,
      urlDocumento: res.Data.UrlDocumento ?? null,
    });
    docId = doc.id;
    digidDocumentId = doc.digidDocumentId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir el PDF.";
    return { ok: false, message: msg };
  }

  let signatoryRowId: string;
  let digidSignatoryId: number;
  try {
    const sigRes = await guardarFirmante({
      IdClient: company.digidIdClient,
      Name: parsed.data.signerName,
      Email: parsed.data.signerEmail.trim(),
    });
    if (!sigRes.Success || sigRes.Data?.id == null) {
      return { ok: false, message: sigRes.Message ?? "No se pudo registrar el firmante en el proveedor." };
    }
    digidSignatoryId = sigRes.Data.id;
    const upserted = await dbSignatoryUpsert(company.id, digidSignatoryId, {
      name: parsed.data.signerName,
      email: parsed.data.signerEmail.trim(),
      phone: null,
      rfc: null,
      isRepLegal: false,
      autoSign: false,
    });
    signatoryRowId = upserted.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar el firmante.";
    return { ok: false, message: msg };
  }

  try {
    await dbDocumentSignatoryReplace(docId, [{ signatoryId: signatoryRowId, kyc: false }]);
    const asig = await asignarFirmantesDocumento({
      IdClient: company.digidIdClient,
      IdDocument: digidDocumentId,
      signatories: [{ id: digidSignatoryId, kyc: false }],
    });
    if (!asig.success) {
      return { ok: false, message: asig.message ?? "No se pudo asignar el firmante en el proveedor." };
    }

    await dbPlacementCreate({
      documentId: docId,
      signatoryId: signatoryRowId,
      ...LAB_PLACEMENT,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al preparar marcas y asignación.";
    return { ok: false, message: msg };
  }

  const sendPayload: SendDocumentParsed = {
    documentId: docId,
    typeSign: 1,
    folioPremium: false,
    colorSign: "#000000",
    remider: 1,
    observerAprove: false,
  };

  const sendRes = await sendDocumentForSigningCore(orgId, sendPayload, { actingUserId: session.user.id });
  if (!sendRes.ok) {
    return {
      ok: false,
      message: `${sendRes.message ?? "No se pudo enviar a firma."} El documento quedó creado: /documentos/${docId}`,
      documentId: docId,
    };
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${docId}`);
  revalidatePath("/envios");
  revalidatePath("/superadmin/prueba-envio-firma");

  return {
    ok: true,
    message:
      "Listo: documento creado y enviado a firma. Si configuraste correo (Resend/SMTP) y notificación a firmantes, revisa la bandeja del correo indicado.",
    documentId: docId,
  };
}
