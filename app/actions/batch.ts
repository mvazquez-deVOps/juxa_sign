"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendDocumentForSigningDefaults } from "@/app/actions/signing";
import {
  dbSigningJobCreate,
  dbSigningJobsList,
  dbSigningJobUpdate,
  dbUserBelongsToOrg,
} from "@/lib/data/repository";
import { gateMutation, requireOrgSession } from "@/lib/gate";
import { requireSuperAdmin } from "@/lib/superadmin";

const idsSchema = z.array(z.string().cuid()).min(1).max(25);

export type BatchUiState = {
  ok: boolean;
  message?: string;
  results?: { documentId: string; ok: boolean; message?: string }[];
};

async function completeSigningBatchJob(params: {
  organizationId: string;
  actingUserId: string;
  documentIds: string[];
  payload: Record<string, unknown>;
}): Promise<BatchUiState> {
  const parsed = idsSchema.safeParse(params.documentIds);
  if (!parsed.success) return { ok: false, message: "Lista inválida (máx. 25 ids)." };

  const job = await dbSigningJobCreate({
    organizationId: params.organizationId,
    clientReference: null,
    payload: { ...params.payload, documentIds: parsed.data },
  });
  await dbSigningJobUpdate(job.id, { status: "RUNNING" });

  const results: { documentId: string; ok: boolean; message?: string }[] = [];
  for (const documentId of parsed.data) {
    const r = await sendDocumentForSigningDefaults(
      params.organizationId,
      documentId,
      params.actingUserId,
    );
    results.push({ documentId, ok: r.ok, message: r.message });
  }

  const allOk = results.every((r) => r.ok);
  await dbSigningJobUpdate(job.id, {
    status: allOk ? "DONE" : "ERROR",
    result: { results },
    errorMessage: allOk ? null : "Al menos un documento falló",
  });

  revalidatePath("/lotes");
  revalidatePath("/envios");
  revalidatePath("/superadmin/lotes");

  return {
    ok: allOk,
    message: allOk ? "Lote procesado correctamente." : "Lote terminado con errores; revisa el detalle.",
    results,
  };
}

export async function runPanelBatchSend(documentIds: string[]): Promise<BatchUiState> {
  const g = await gateMutation();
  if (!g.ok) return { ok: false, message: g.message };
  return completeSigningBatchJob({
    organizationId: g.session.user.organizationId,
    actingUserId: g.session.user.id,
    documentIds,
    payload: { source: "panel" },
  });
}

export async function runSuperadminBatchSend(
  organizationId: string,
  actingUserId: string,
  documentIds: string[],
): Promise<BatchUiState> {
  await requireSuperAdmin();
  const belongs = await dbUserBelongsToOrg(actingUserId, organizationId);
  if (!belongs) {
    return { ok: false, message: "El usuario de cartera no pertenece a la organización elegida." };
  }
  return completeSigningBatchJob({
    organizationId,
    actingUserId,
    documentIds,
    payload: { source: "superadmin_panel" },
  });
}

export async function listRecentSigningJobs(take = 20) {
  const g = await requireOrgSession();
  if (!g.ok) return { jobs: [] as Awaited<ReturnType<typeof dbSigningJobsList>>, message: g.message };
  const jobs = await dbSigningJobsList(g.session.user.organizationId, take);
  return { jobs };
}
