import type { ReactNode } from "react";
import Link from "next/link";
import { FileSignature, Building2, Users, FileText, LayoutDashboard, Settings, Send, Map, TrendingUp, UserPlus, Layers, KeyRound, Shield, Coins, CircleHelp, FlaskConical, } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSessionBlock, type SessionUserChip } from "@/components/sidebar-session";
import { ThemeToggle } from "@/components/theme-toggle";

const navCore = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/envios", label: "Envíos", icon: Send },
  { href: "/folios", label: "Mis folios", icon: Coins },
  { href: "/folios/planes", label: "Planes de folios", icon: Coins },
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/configuracion/equipo", label: "Equipo", icon: UserPlus },
];

const navConsumerFolio = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/envios", label: "Envíos", icon: Send },
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/folios", label: "Mis folios", icon: Coins },
  { href: "/folios/planes", label: "Planes de folios", icon: Coins },
];

/** Rol VIEWER: solo visualización; consulta + planes; sin configuración ni lotes. */
const navPanelReadOnly = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/envios", label: "Envíos", icon: Send },
  { href: "/folios", label: "Mis folios", icon: Coins },
  { href: "/folios/planes", label: "Planes de folios", icon: Coins },
];

export function AppShell({
  children,
  pathname,
  demoLogout,
  sessionUser,
  showAdminNav,
  showSuperAdminNav,
  consumerFolioNav,
  panelReadOnlyNav,
  memoryDataStore,
  memoryDevSubtitle,
  trialBanner,
}: {
  children: React.ReactNode;
  pathname: string;
  demoLogout?: boolean;
  sessionUser?: SessionUserChip | null;
  showAdminNav?: boolean;
  showSuperAdminNav?: boolean;
  consumerFolioNav?: boolean;
  panelReadOnlyNav?: boolean;
  memoryDataStore: boolean;
  memoryDevSubtitle?: boolean;
  /** Aviso de periodo de prueba (registro SaaS). */
  trialBanner?: ReactNode;
}) {
  const memoryMode = memoryDataStore;
  const platformNav = showSuperAdminNav
    ? [{ href: "/superadmin", label: "Plataforma", icon: Shield }]
    : [];
  const adminOnlyNav = showAdminNav
    ? [
        { href: "/configuracion/api-keys", label: "API keys", icon: KeyRound },
      ]
    : [];
  const nav = consumerFolioNav
    ? [...navConsumerFolio, ...platformNav]
    : panelReadOnlyNav
      ? [...navPanelReadOnly, ...platformNav]
      : [...navCore, ...platformNav, ...adminOnlyNav];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card shadow-sm dark:border-white/[0.06] dark:bg-card/95 dark:shadow-none md:flex md:backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4 dark:border-white/[0.06]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2ABDA8]/25 bg-gradient-to-br from-[#2ABDA8]/20 to-[#1d4ed8]/15 text-[#2ABDA8] dark:text-[#5ee4d4]">
              <FileSignature className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Juxa Sign</p>
              <p className="truncate text-xs text-muted-foreground">
                {memoryMode && memoryDevSubtitle
                  ? "Modo memoria · sin Postgres"
                  : "Firma electrónica certificada"}
              </p>
            </div>
          </div>
          <div className="relative shrink-0">
            <ThemeToggle />
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
                    ? "bg-primary/12 text-primary dark:bg-[#1d4ed8]/15 dark:text-[#93c5fd]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/[0.05]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SidebarSessionBlock sessionUser={sessionUser ?? null} demoLogout={demoLogout} />
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md dark:border-white/[0.06] md:hidden">
          <div className="flex h-12 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-[#2ABDA8]" />
              <span className="font-semibold">Juxa Sign</span>
            </div>
            <ThemeToggle />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-sm">
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-medium",
                    active
                      ? "bg-primary/12 text-primary dark:bg-[#1d4ed8]/15 dark:text-[#93c5fd]"
                      : "text-muted-foreground hover:bg-muted dark:hover:bg-white/[0.05]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t">
            <SidebarSessionBlock sessionUser={sessionUser ?? null} demoLogout={demoLogout} />
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          {trialBanner}
          {children}
        </main>
      </div>
    </div>
  );
}
