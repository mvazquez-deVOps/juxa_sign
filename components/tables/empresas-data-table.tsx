"use client";

import Link from "next/link";
import { SortableTableHead } from "@/components/tables/sortable-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type EmpresaRow = {
  id: string;
  razonSocial: string;
  rfc: string;
  email: string;
  digidIdClient: number;
};

export function EmpresasDataTable({ data }: { data: EmpresaRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "razonSocial", desc: false }]);

  const columns = React.useMemo<ColumnDef<EmpresaRow>[]>(
    () => [
      {
        accessorKey: "razonSocial",
        header: "Razón social",
        cell: ({ row }) => <span className="font-medium">{row.original.razonSocial}</span>,
      },
      { accessorKey: "rfc", header: "RFC" },
      { accessorKey: "email", header: "Correo" },
      {
        accessorKey: "digidIdClient",
        header: "Id. cliente",
        cell: ({ row }) => <Badge variant="secondary">{row.original.digidIdClient}</Badge>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/firmantes?companyId=${row.original.id}`}>Firmantes</Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
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
