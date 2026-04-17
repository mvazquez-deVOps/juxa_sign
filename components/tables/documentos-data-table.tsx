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
import { Eye, RefreshCw, Send, UserPlus } from "lucide-react";
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
  companyId: string;
  companyName: string;
  /** Firmantes dados de alta para el cliente (empresa); no implica vínculo DocumentSignatory. */
  companySignatoryCount: number;
  digidDocumentId: number;
  status: string | null;
  /** Vínculos documento ↔ firmante (tras asignar en flujo de envío). */
  signatories: { id: string }[];
};

function isLikelyUnsentDraft(status: string | null | undefined): boolean {
  if (status == null) return true;
  const t = status.trim();
  if (t === "") return true;
  return /borrador|draft/i.test(t);
}

function SyncEstadoButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      title="Sincronizar estado"
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

function DocumentoActionsCell({
  doc,
  showEnviarLink,
}: {
  doc: DocumentoRow;
  showEnviarLink: boolean;
}) {
  const hasCompanyCatalogSignatories = doc.companySignatoryCount > 0;
  const hasDocSignatories = doc.signatories.length > 0;

  if (!showEnviarLink) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 font-normal text-sm" asChild>
          <Link href={`/documentos/${doc.id}`}>
            <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Visor
          </Link>
        </Button>
      </div>
    );
  }

  if (!hasCompanyCatalogSignatories) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 font-normal text-sm" asChild>
          <Link href={`/firmantes?companyId=${encodeURIComponent(doc.companyId)}`}>
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            Asignar firmantes
          </Link>
        </Button>
      </div>
    );
  }

  const showEnviar = hasDocSignatories && isLikelyUnsentDraft(doc.status);

  return (
    <div className="flex flex-wrap items-center justify-start gap-1">
      <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 font-normal text-sm" asChild>
        <Link href={`/documentos/${doc.id}`}>
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          Visor
        </Link>
      </Button>
      {showEnviar ? (
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 font-normal text-sm" asChild>
          <Link href={`/documentos/${doc.id}/enviar`}>
            <Send className="h-4 w-4 shrink-0" aria-hidden />
            Enviar
          </Link>
        </Button>
      ) : null}
    </div>
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
        header: "Empresa o Cliente",
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
        accessorKey: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-start"> {/* Cambiado a justify-start */}
            <DocumentoActionsCell doc={row.original} showEnviarLink={showEnviarLink} />
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
                <SortableTableHead key={h.id} header={h} alignRight={false} />
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
