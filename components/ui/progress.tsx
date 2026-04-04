"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ className, value = 0 }: { className?: string; value?: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/15", className)}
    >
      <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${v}%` }} />
    </div>
  );
}
