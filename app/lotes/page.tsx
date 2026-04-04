import Link from "next/link";
import { dbDocumentsForBatchPicker, dbSigningJobsList } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { isOrganizationAdmin } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org-scope";
import { LotesClient } from "./lotes-client";

export const dynamic = "force-dynamic";

export default async function LotesPage() {
  const { organizationId, role } = await requireOrgContext();
  const showBatchApiHint = isOrganizationAdmin(role);
  const [jobsRaw, pickerDocs] = await Promise.all([
    dbSigningJobsList(organizationId, 40),
    dbDocumentsForBatchPicker(organizationId),
  ]);
  const jobs = jobsRaw.map((j) => ({
    id: j.id,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
    errorMessage: j.errorMessage,
    result: j.result,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lotes de envío</h1>
          <p className="text-muted-foreground">
            Envía varios documentos a firmar en secuencia (mismas reglas que “Enviar a firmar”: marcas y firmantes
            asignados).
            {showBatchApiHint ? (
              <>
                {" "}
                Con API key:{" "}
                <code className="rounded bg-muted px-1 text-xs">POST /api/v1/batch/send</code> (un documento por
                solicitud; el campo es <code className="rounded bg-muted px-1 text-xs">documentId</code>).
              </>
            ) : null}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/documentos">Documentos</Link>
        </Button>
      </div>
      <LotesClient initialJobs={jobs} documents={pickerDocs} />
    </div>
  );
}
