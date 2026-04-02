import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function EmpresasPage() {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Clientes registrados en DIGID (IdClient) y sincronizados en Juxa Sign.
          </p>
        </div>
        <Button asChild>
          <Link href="/empresas/nueva">
            <Plus className="h-4 w-4" />
            Nueva empresa
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
          <CardDescription>
            Usa el IdClient de DIGID en firmantes y documentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">Aún no hay empresas. Luego sigue el checklist en la guía E2E.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/empresas/nueva">Registrar la primera</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/prueba-e2e">Guía de prueba</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>IdClient DIGID</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.razonSocial}</TableCell>
                    <TableCell>{c.rfc}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.digidIdClient}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={`/firmantes?companyId=${c.id}`}>Firmantes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
