import Link from "next/link";
import { Building2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeHero } from "@/components/home-hero";
import { HomeOnboarding } from "@/components/home-onboarding";
import { getHomeDashboardCounts } from "@/lib/data";
import { requireOrgContext } from "@/lib/org-scope";
import { PotentialConsumerCallout } from "@/components/potential-consumer-callout";
import { showsPanelSandboxHints } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { organizationId, role } = await requireOrgContext();
  const { companies, signatories, documents, placements } =
    await getHomeDashboardCounts(organizationId);
  const sandboxHome = showsPanelSandboxHints(role);

  return (
    <div className="space-y-10">
      <PotentialConsumerCallout variant="home" />
      <HomeHero showSandboxShortcuts={sandboxHome} />

      <HomeOnboarding
        showSandboxSection={sandboxHome}
        counts={{
          companies,
          signatories,
          documents,
          placements,
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Clientes</CardTitle>
            <CardDescription>
              Alta en el proveedor: empresa o persona física. Guardamos el Id. de cliente para firmantes y documentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/empresas">Ir a clientes</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Documentos</CardTitle>
            <CardDescription>Sube PDF, marca firmas y envía el flujo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/documentos">Ir a documentos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Servidor seguro</CardTitle>
            <CardDescription>Las credenciales del proveedor solo viven en el servidor.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
