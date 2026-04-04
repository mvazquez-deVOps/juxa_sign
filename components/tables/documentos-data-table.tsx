"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead } from "@/components/tables/sortable-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export type DocumentoRow = {
  id: string;
  nameDoc: string;
  companyName: string;
  digidDocumentId: number;
  status: string | null;
};

export function DocumentosDataTable({
  data,
  showEnviarLink = true,
}: {
  data: DocumentoRow[];
  /** Rol VIEWER: sin acceso a la pantalla de envío. */
  showEnviarLink?: boolean;
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
          <span className="text-muted-foreground">{row.original.status ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="text-right">Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-x-2 text-right">
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
    [showEnviarLink],
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
