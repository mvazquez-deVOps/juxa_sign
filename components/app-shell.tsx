import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Users, FileText, LayoutDashboard, Settings, Send, Map, TrendingUp, UserPlus, Layers, KeyRound, Shield, Coins, CircleHelp, FlaskConical, Wallet2, WalletCards, } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSessionBlock, type SessionUserChip } from "@/components/sidebar-session";
import { ThemeToggle } from "@/components/theme-toggle";

const navCore = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/lotes", label: "Envíos masivos", icon: Layers },
  { href: "/envios", label: "Bandeja de envíos", icon: Send },
  { href: "/folios", label: "Mis folios", icon: Wallet2 },
  { href: "/folios/planes", label: "Planes", icon: WalletCards },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
];

const navConsumerFolio = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/lotes", label: "Envíos masivos", icon: Layers },
  { href: "/envios", label: "Bandeja de envíos", icon: Send },
  { href: "/folios", label: "Mis folios", icon: Wallet2 },
  { href: "/folios/planes", label: "Planes", icon: WalletCards },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
];

/** Rol VIEWER: solo visualización; consulta + planes; sin configuración ni lotes. */
const navPanelReadOnly = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/empresas", label: "Clientes", icon: Building2 },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/firmantes", label: "Firmantes", icon: Users },
  { href: "/envios", label: "Bandeja de envíos", icon: Send },
  { href: "/folios", label: "Mis folios", icon: Wallet2 },
  { href: "/folios/planes", label: "Planes", icon: WalletCards },
  { href: "/ayuda", label: "Ayuda", icon: CircleHelp },
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
    
  const adminOnlyNav: any[] = [];

  const nav = consumerFolioNav
    ? [...navConsumerFolio, ...platformNav]
    : panelReadOnlyNav
      ? [...navPanelReadOnly, ...platformNav]
      : [...navCore, ...platformNav, ...adminOnlyNav];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card shadow-sm dark:border-white/[0.06] dark:bg-card/95 dark:shadow-none md:flex md:backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4 dark:border-white/[0.06]">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Image
              src="/JUXA01.png"
              alt="Juxa Sign"
              width={320}
              height={72}
              className="h-9 w-auto shrink-0"
              priority
            />
            <div className="min-w-0 flex-1">
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
            <div className="flex min-w-0 items-center gap-1.5">
              <Image
                src="/JUXA01.png"
                alt="Juxa Sign"
                width={320}
                height={72}
                className="h-8 w-auto shrink-0"
                priority
              />
              <span className="min-w-0 truncate font-semibold">Juxa Sign</span>
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
