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

export default async function DocumentosPage() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">PDFs creados en DIGID y seguimiento local.</p>
        </div>
        <Button asChild>
          <Link href="/documentos/nuevo">
            <Plus className="h-4 w-4" />
            Subir documento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>IdDocumento DIGID y enlace al archivo.</CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">No hay documentos. Necesitas empresa y firmantes antes.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/documentos/nuevo">Subir el primero</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/prueba-e2e">Orden del checklist</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Id DIGID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nameDoc}</TableCell>
                    <TableCell>{d.company.razonSocial}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.digidDocumentId}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.status ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={`/documentos/${d.id}`}>Visor / firmas</Link>
                      </Button>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={`/documentos/${d.id}/enviar`}>Enviar</Link>
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
