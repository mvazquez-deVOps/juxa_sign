import { dbCompaniesFindManyByRazon } from "@/lib/data/repository";
import { isMemoryDataStore } from "@/lib/data/mode";
import { canMutate } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { redirect } from "next/navigation";
import { NuevoDocumentoForm } from "./nuevo-documento-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ registrado?: string; companyId?: string }> };

export default async function NuevoDocumentoPage({ searchParams }: Props) {
  const { organizationId, role } = await requireOrgContext();
  if (!canMutate(role)) {
    redirect("/documentos");
  }
  const sp = await searchParams;
  const companies = await dbCompaniesFindManyByRazon(organizationId, "asc");
  const rows = companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }));
  const preselectCompanyId =
    typeof sp.companyId === "string" && sp.companyId.length > 0 ? sp.companyId : undefined;
  return (
    <NuevoDocumentoForm
      companies={rows}
      memoryDataStore={isMemoryDataStore()}
      justRegisteredClient={sp.registrado === "1"}
      preselectCompanyId={preselectCompanyId}
    />
  );
}
