"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableTableHead } from "@/components/tables/sortable-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export type EnvioRow = {
  id: string;
  nameDoc: string;
  companyName: string;
  digidDocumentId: number;
  status: string | null;
  lastStatusSyncAt: string | null;
  updatedAt: string;
};

export function EnviosDataTable({
  data,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = true,
  showEnviarLink = true,
}: {
  data: EnvioRow[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void;
  /** Rol VIEWER: sin checkboxes ni sincronización por lote. */
  enableRowSelection?: boolean;
  /** Rol VIEWER: enlace al detalle del documento en lugar de envío. */
  showEnviarLink?: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nameDoc", desc: false }]);
  const [internalSelection, setInternalSelection] = React.useState<RowSelectionState>({});
  const selection = rowSelection ?? internalSelection;
  const setSelection = onRowSelectionChange ?? setInternalSelection;

  const columns = React.useMemo<ColumnDef<EnvioRow>[]>(() => {
    const selectColumn: ColumnDef<EnvioRow> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      size: 36,
    };

    const body: ColumnDef<EnvioRow>[] = [
      {
        accessorKey: "nameDoc",
        header: "Documento",
        cell: ({ row }) => <span className="font-medium">{row.original.nameDoc}</span>,
      },
      { accessorKey: "companyName", header: "Empresa" },
      {
        accessorKey: "digidDocumentId",
        header: "Id. documento",
        cell: ({ row }) => <Badge variant="outline">{row.original.digidDocumentId}</Badge>,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) =>
          row.original.status ? (
            <Badge variant="secondary">{row.original.status}</Badge>
          ) : (
            <span className="text-muted-foreground">Sin sincronizar</span>
          ),
      },
      {
        accessorKey: "lastStatusSyncAt",
        header: "Última sync",
        cell: ({ row }) =>
          row.original.lastStatusSyncAt ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(row.original.lastStatusSyncAt).toLocaleString("es-MX")}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="text-right">Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link
                href={
                  showEnviarLink
                    ? `/documentos/${row.original.id}/enviar`
                    : `/documentos/${row.original.id}`
                }
              >
                {showEnviarLink ? "Enviar / URLs" : "Detalle"}
              </Link>
            </Button>
          </div>
        ),
      },
    ];

    return enableRowSelection ? [selectColumn, ...body] : body;
  }, [enableRowSelection, showEnviarLink]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection: selection },
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    enableRowSelection,
    getRowId: (row) => row.id,
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
