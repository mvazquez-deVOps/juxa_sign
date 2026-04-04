import { canMutate } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { redirect } from "next/navigation";

export default async function NuevaEmpresaLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireOrgContext();
  if (!canMutate(role)) redirect("/empresas");
  return children;
}
