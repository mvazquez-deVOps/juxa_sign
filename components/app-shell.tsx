import Link from "next/link";
import {
  FileSignature,
  Building2,
  Users,
  FileText,
  LayoutDashboard,
  Settings,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/envios", label: "Envíos", icon: Send },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card shadow-sm md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Juxa Sign</p>
            <p className="text-xs text-muted-foreground">Firma con DIGID</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur md:hidden">
          <div className="flex h-12 items-center gap-2 px-4">
            <FileSignature className="h-6 w-6 text-primary" />
            <span className="font-semibold">Juxa Sign</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm">
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
