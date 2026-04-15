"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshDocumentStatus } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead } from "@/components/tables/sortable-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DocumentoRow = {
  id: string;
  nameDoc: string;
  companyName: string;
  digidDocumentId: number;
  status: string | null;
};

function SyncEstadoButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      title="Sincronizar estado con DIGID"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void refreshDocumentStatus(documentId).then((r) => {
          setPending(false);
          if (r.ok) {
            toast.success("Estado actualizado");
            router.refresh();
          } else toast.error(r.message ?? "No se pudo sincronizar");
        });
      }}
    >
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden />
      <span className="sr-only">Sincronizar estado</span>
    </Button>
  );
}

export function DocumentosDataTable({
  data,
  showEnviarLink = true,
  canSyncRemote = false,
}: {
  data: DocumentoRow[];
  /** Rol VIEWER: sin acceso a la pantalla de envío. */
  showEnviarLink?: boolean;
  /** Roles de solo lectura del panel: ocultar sincronización remota. */
  canSyncRemote?: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "digidDocumentId", desc: true }]);

  const columns = React.useMemo<ColumnDef<DocumentoRow>[]>(
    () => [
      {
        id: "nameDoc",
        accessorKey: "nameDoc",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium">{row.original.nameDoc}</span>,
      },
      {
        id: "companyName",
        accessorKey: "companyName",
        header: "Empresa",
      },
      {
        id: "digidDocumentId",
        accessorKey: "digidDocumentId",
        header: "Id. documento",
        cell: ({ row }) => <Badge variant="outline">{row.original.digidDocumentId}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{row.original.status ?? "—"}</span>
            {canSyncRemote ? <SyncEstadoButton documentId={row.original.id} /> : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="text-right">Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/documentos/${row.original.id}`}>Visor / firmas</Link>
            </Button>
            {showEnviarLink ? (
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href={`/documentos/${row.original.id}/enviar`}>Enviar</Link>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [showEnviarLink, canSyncRemote],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <SortableTableHead key={h.id} header={h} alignRight={h.column.id === "actions"} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
