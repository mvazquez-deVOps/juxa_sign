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
import { Ban, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cancelDocumentAction, downloadConstanciaAction } from "@/app/actions/document";
import { isDocumentCompleted } from "@/lib/document-cancel-policy";
import { getBulkSignerUrls } from "@/app/actions/signing";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableTableHead } from "@/components/tables/sortable-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { isDocumentCancelBlocked } from "@/lib/document-cancel-policy";

export type EnvioRow = {
  id: string;
  nameDoc: string;
  companyName: string;
  digidDocumentId: number;
  status: string | null;
  lastStatusSyncAt: string | null;
  updatedAt: string;
};

function ConstanciaNom151Button({ documentId }: { documentId: string }) {
  const [pending, start] = React.useTransition();

  function onClick() {
    start(async () => {
      await toast.promise(
        downloadConstanciaAction(documentId).then((r) => {
          if (!r.ok) throw new Error(r.message);
          const bin = atob(r.pdfBase64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = r.fileName;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }),
        {
          loading: "Generando constancia NOM-151…",
          success: "Constancia descargada",
          error: (e) => (e instanceof Error ? e.message : "No se pudo generar la constancia."),
        },
      );
    });
  }

  return (
    <Button
      type="button"
      variant="link"
      disabled={pending}
      className="h-auto px-0 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      onClick={onClick}
    >
      {pending ? "Generando…" : "Constancia"}
    </Button>
  );
}

function EnviosRowActions({ row }: { row: EnvioRow }) {
  const [open, setOpen] = React.useState(false);
  const [copyPending, startCopy] = React.useTransition();
  const [cancelPending, startCancel] = React.useTransition();
  const cancelBlocked = isDocumentCancelBlocked(row.status);

  function copyPublicSignerUrl() {
    startCopy(async () => {
      const r = await getBulkSignerUrls(row.id);
      if (!r.ok || r.urls.length === 0 || !r.urls[0]?.url) {
        toast.error(r.ok ? "No hay URL de firma disponible aún." : (r.message ?? "No se pudo obtener el enlace."));
        return;
      }
      try {
        await navigator.clipboard.writeText(r.urls[0].url);
        toast.success("Enlace copiado");
      } catch {
        toast.error("No se pudo copiar al portapapeles.");
      }
    });
  }

  function confirmCancel() {
    startCancel(async () => {
      const r = await cancelDocumentAction(row.id);
      if (r.ok) {
        toast.success(r.message ?? "Documento cancelado.");
        setOpen(false);
      } else {
        toast.error(r.message ?? "No se pudo cancelar.");
      }
    });
  }

  return (
    <div className="flex justify-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        title="Copiar enlace de firma"
        disabled={copyPending}
        onClick={() => copyPublicSignerUrl()}
      >
        <Link2 className="h-4 w-4" />
        <span className="sr-only">Copiar enlace</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          title="Cancelar documento"
          disabled={cancelBlocked || cancelPending}
          onClick={() => setOpen(true)}
        >
          <Ban className="h-4 w-4" />
          <span className="sr-only">Cancelar</span>
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de cancelar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se te reembolsarán los créditos utilizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelPending}>Volver</AlertDialogCancel>
            <Button variant="destructive" disabled={cancelPending} onClick={() => confirmCancel()}>
              {cancelPending ? "Procesando…" : "Sí, cancelar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
        header: () => <span>Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const completed = isDocumentCompleted(row.original.status);
          return (
            <div className="flex flex-wrap items-center justify-start gap-3">
              {completed ? (
                <ConstanciaNom151Button documentId={row.original.id} />
              ) : (
                <Button variant="link" className="h-auto px-0 text-xs" asChild>
                  <Link
                    href={
                      showEnviarLink
                        ? `/documentos/${row.original.id}/enviar`
                        : `/documentos/${row.original.id}`
                    }
                  >
                    {showEnviarLink ? "Panel envío" : "Detalle"}
                  </Link>
                </Button>
              )}
              <EnviosRowActions row={row.original} />
            </div>
          );
        },
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
                <SortableTableHead key={h.id} header={h} />
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
