"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCertificateCreate,
  dbCompanyFindFirstInOrg,
  dbDocumentFindFirstInOrgWithCompany,
} from "@/lib/data/repository";
import { digidCertifyNom151Form, registrarWebhook } from "@/lib/digid";
import { gateMutation } from "@/lib/gate";
import fs from "fs/promises";
import path from "path";

const webhookSchema = z.object({
  companyId: z.string().cuid(),
});

export type ConfigActionState = { ok: boolean; message?: string };

export async function registerDigidWebhook(
  _prev: ConfigActionState | null,
  formData: FormData,
): Promise<ConfigActionState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  if (g.session.user.role === "USER") {
    return { ok: false, message: "Tu cuenta no puede configurar webhooks." };
  }
  const orgId = g.session.user.organizationId;

  const parsed = webhookSchema.safeParse({ companyId: formData.get("companyId") });
  if (!parsed.success) return { ok: false, message: "Empresa inválida." };
  const company = await dbCompanyFindFirstInOrg(parsed.data.companyId, orgId);
  if (!company) return { ok: false, message: "Empresa no encontrada." };

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const secret = process.env.DIGID_WEBHOOK_SECRET?.trim();
  const url = secret ? `${base}/api/webhooks/digid?secret=${encodeURIComponent(secret)}` : `${base}/api/webhooks/digid`;

  try {
    const res = await registrarWebhook({ IdClient: company.digidIdClient, Url: url });
    if (!res.success) {
      return { ok: false, message: res.message ?? "El proveedor rechazó el webhook." };
    }
    revalidatePath("/configuracion");
    return { ok: true, message: "Webhook registrado en el proveedor." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return { ok: false, message: msg };
  }
}

export async function certifyStoredDocument(documentId: string): Promise<ConfigActionState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  if (g.session.user.role === "USER") {
    return { ok: false, message: "Tu cuenta no puede constancias desde esta acción." };
  }
  const orgId = g.session.user.organizationId;

  const doc = await dbDocumentFindFirstInOrgWithCompany(documentId, orgId);
  if (!doc?.urlDocumento) {
    return { ok: false, message: "Documento sin URL para descargar." };
  }
  try {
    const token = process.env.DIGID_TOKEN?.trim();
    const pdfRes = await fetch(doc.urlDocumento, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!pdfRes.ok) return { ok: false, message: "No se pudo descargar el PDF." };
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    const res = await digidCertifyNom151Form(doc.company.digidIdClient, buf, doc.nameDoc);

    if (res.responseType === "json") {
      const b = res.body as Record<string, unknown>;
      const certOk =
        b.Success === true ||
        b.success === true ||
        b.Success === 1 ||
        b.success === 1;
      const certMsg = [b.Message, b.message].find(
        (m): m is string => typeof m === "string" && m.length > 0,
      );
      if (!certOk) {
        return { ok: false, message: certMsg ?? "certify_doc falló." };
      }
      revalidatePath(`/documentos/${doc.id}`);
      return {
        ok: true,
        message:
          certMsg ??
          "Certificación aceptada por el proveedor (respuesta sin PDF; revisa el panel del proveedor o el manual del endpoint 18).",
      };
    }

    const uploadDir = path.join(process.cwd(), "uploads", "certificates");
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `cert-${doc.digidDocumentId}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, Buffer.from(res.buffer));

    await dbCertificateCreate({
      documentId: doc.id,
      fileName,
      filePath,
      mimeType: "application/pdf",
    });
    revalidatePath(`/documentos/${doc.id}`);
    return { ok: true, message: "Constancia PDF guardada localmente." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return { ok: false, message: msg };
  }
}
