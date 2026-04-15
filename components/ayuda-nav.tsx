"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/ayuda", label: "Inicio" },
] as const;

export function AyudaNav() {
  const pathname = usePathname() ?? "/ayuda";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4" aria-label="Secciones de ayuda">
      {links.map(({ href, label }) => {
        const active =
          href === "/ayuda" ? pathname === "/ayuda" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
