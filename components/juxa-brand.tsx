import { Signature } from "lucide-react";
import { isMemoryDataStore } from "@/lib/data/mode";
import { cn } from "@/lib/utils";

type Variant = "default" | "loginPanel";

/** Marca Juxa Sign: panel estándar o columna de login (sobre fondo oscuro). */
export function JuxaBrand({
  className,
  variant = "default",
  subtitle,
  /** En componentes cliente, pásalo desde el servidor; `JUXA_DATA_STORE` no va al bundle del cliente. */
  memoryMode: memoryModeProp,
}: {
  className?: string;
  variant?: Variant;
  subtitle?: string;
  memoryMode?: boolean;
}) {
  const memoryMode = memoryModeProp ?? isMemoryDataStore();
  const sub =
    subtitle ??
    (memoryMode ? "Modo memoria · sin Postgres" : "Firma electrónica certificada");

  if (variant === "loginPanel") {
    return (
      <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2ABDA8]/25 bg-[#2ABDA8]/10 text-[#2ABDA8]">
          <Signature className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-white">Juxa Sign</p>
          <p className="text-xs text-zinc-500">{sub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#2ABDA8]/25 bg-gradient-to-br from-[#2ABDA8]/15 to-[#1d4ed8]/10 text-[#2ABDA8] dark:border-[#2ABDA8]/30 dark:from-[#2ABDA8]/20 dark:to-[#1d4ed8]/15 dark:text-[#5ee4d4]">
        <Signature className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-xl font-semibold tracking-tight">Juxa Sign</p>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
