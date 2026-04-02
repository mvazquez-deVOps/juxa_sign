import Link from "next/link";
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
import { EnviosSyncAllButton } from "./envios-sync-all";

export default async function EnviosPage() {
  const docs = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envíos</h1>
          <p className="text-muted-foreground">
            Seguimiento de documentos enviados a firmar: estado en DIGID (webhook o{" "}
            <code className="text-xs">dInfoDocto</code>).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EnviosSyncAllButton disabled={docs.length === 0} />
          <Button variant="outline" asChild>
            <Link href="/documentos">Todos los documentos</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En trámite</CardTitle>
          <CardDescription>
            Consulta URLs de firma y reenvíos desde la vista “Enviar a firmar” de cada documento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">No hay documentos registrados.</p>
              <Button asChild>
                <Link href="/documentos/nuevo">Subir documento</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
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
                    <TableCell>
                      {d.status ? (
                        <Badge variant="secondary">{d.status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Sin sincronizar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={`/documentos/${d.id}/enviar`}>Enviar / URLs</Link>
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
