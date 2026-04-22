import Link from "next/link";
import type { ReactNode } from "react";
import { juxaLoginHeroH1Class, juxaLoginHeroSpanMutedClass } from "@/components/auth-page-styles";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function JuxaLoginShell({
  children,
  aside,
  topRight,
  heroTitle,
  heroLead,
}: {
  children: ReactNode;
  /** Contenido extra bajo el hero (p. ej. avisos demo). */
  aside?: ReactNode;
  /** Esquina superior derecha (p. ej. tema). */
  topRight?: ReactNode;
  /** Sustituye el titular del hero (por defecto: firma electrónica). */
  heroTitle?: ReactNode;
  /** Sustituye el párrafo bajo el titular. */
  heroLead?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col bg-background text-foreground antialiased transition-colors duration-200",
        "selection:bg-[#2ABDA8]/25 selection:text-foreground dark:selection:text-white",
      )}
    >
      {topRight ? (
        <div className="absolute right-5 top-5 z-20 lg:right-8 lg:top-8">{topRight}</div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-1/4 top-0 h-[min(70vh,520px)] w-[min(90vw,640px)] rounded-full opacity-[0.07] blur-[100px]"
          style={{
            background: "radial-gradient(ellipse at center, #2ABDA8 0%, #1d4ed8 55%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-[1] grid flex-1 lg:grid-cols-[1fr_min(440px,100%)] lg:gap-0">
        <header className="flex flex-col justify-center px-8 pb-10 pt-16 lg:px-14 lg:pb-24 lg:pt-0">
          <div className="mx-auto w-full max-w-lg lg:mx-0">
            <Image
              src="/LOGO2.png"
              alt="Logo de Juxa"
              width={280}
              height={100}
              priority
              className="h-[60px] w-auto max-w-[min(100%,280px)] object-contain object-left drop-shadow-[0_0_32px_rgba(42,189,168,0.15)]"
            />
            <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.45em] text-zinc-500">Sign</p>

            <div className="mt-10">
              {heroTitle ?? (
                <h1 className={juxaLoginHeroH1Class}>
                  <span className="font-semibold">Firma electrónica</span>
                  <span className={juxaLoginHeroSpanMutedClass}> — clara, segura y lista para producción.</span>
                </h1>
              )}
            </div>

            <div className="mt-6 max-w-md text-sm font-light leading-relaxed text-muted-foreground dark:text-zinc-400">
              {heroLead ?? (
                <p>
                  Panel de envíos y seguimiento de firmas. Menos fricción, más control para tu equipo.
                </p>
              )}
            </div>

            {aside ? <div className="mt-10 max-w-md">{aside}</div> : null}
          </div>
        </header>

        <main className="flex items-center justify-center px-6 pb-16 pt-4 lg:px-10 lg:py-16">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>

      <footer className="relative z-[1] border-t border-border px-6 py-5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>JX Labs | Todos los derechos reservados &copy; {new Date().getFullYear()}</span>
            <span className="hidden h-3 w-px bg-border sm:inline" aria-hidden />
            <span className="text-teal-700 dark:text-[#2ABDA8]/90">Encriptación de grado legal</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 uppercase tracking-normal">
            <a
              href="mailto:soporte@juxa.mx"
              className="text-muted-foreground transition hover:text-teal-700 dark:hover:text-[#2ABDA8]"
            >
              soporte@juxa.mx
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
