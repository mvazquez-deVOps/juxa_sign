"use client";

import { flexRender, type Header } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

export function SortableTableHead<TData, TValue>({
  header,
  alignRight,
}: {
  header: Header<TData, TValue>;
  alignRight?: boolean;
}) {
  const sorted = header.column.getIsSorted();
  const canSort = header.column.getCanSort();

  return (
    <TableHead
      className={
        alignRight ? "text-right" : canSort ? "cursor-pointer select-none" : undefined
      }
      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
    >
      {header.isPlaceholder ? null : (
        <span className="inline-flex items-center gap-1">
          {flexRender(header.column.columnDef.header, header.getContext())}
          {canSort ? (
            sorted === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5 opacity-60" />
            ) : sorted === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 opacity-60" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
            )
          ) : null}
        </span>
      )}
    </TableHead>
  );
}
