import Link from "next/link";
import { dbSuperAdminOrganizationsListForAdminTable } from "@/lib/data/repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(d: Date) {
  return d.toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default async function SuperadminOrganizacionesPage() {
  const rows = await dbSuperAdminOrganizationsListForAdminTable();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Organizaciones</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cada fila es un <strong className="font-medium text-foreground">tenant</strong> (cuenta SaaS): usuarios del panel,
          carteras de folios y aislamiento de datos. Los <strong className="font-medium text-foreground">clientes</strong> que
          operan en DIGID día a día son las <strong className="font-medium text-foreground">empresas</strong> registradas
          dentro de esa organización; las ves y gestionas en el panel en{" "}
          <Link href="/empresas" className="text-primary underline">
            Clientes
          </Link>
          . Clic en el nombre para ajustes de la organización, periodo de prueba y contexto operativo.
        </p>
        <p className="text-sm text-muted-foreground">
          Para acreditar folios o ver el ledger global:{" "}
          <Link href="/superadmin/folios" className="text-primary underline">
            Folios plataforma
          </Link>
          .
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right tabular-nums">Usuarios</TableHead>
              <TableHead className="text-right tabular-nums">Empresas</TableHead>
              <TableHead className="text-right tabular-nums">Σ folios</TableHead>
              <TableHead>Prueba</TableHead>
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay organizaciones.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">
                    <Link href={`/superadmin/organizaciones/${org.id}`} className="text-primary hover:underline">
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                  <TableCell className="text-right tabular-nums">{org.userCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{org.companyCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{org.totalFolioBalance}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.trialEndsAt ? formatDate(org.trialEndsAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
