import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AyudaNav } from "@/components/ayuda-nav";

export default function AyudaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Centro de ayuda</p>
        <p className="mt-2 text-muted-foreground">
          Encuentra una guía clara para usar la plataforma de firma electrónica.
        </p>
      </div>
      <AyudaNav />
      {children}
    </div>
  );
}
