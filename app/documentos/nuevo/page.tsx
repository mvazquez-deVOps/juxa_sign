import { prisma } from "@/lib/prisma";
import { NuevoDocumentoForm } from "./nuevo-documento-form";

export default async function NuevoDocumentoPage() {
  const companies = await prisma.company.findMany({ orderBy: { razonSocial: "asc" } });
  return (
    <NuevoDocumentoForm
      companies={companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }))}
    />
  );
}
