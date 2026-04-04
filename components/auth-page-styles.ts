/**
 * Paleta fija (zinc) para pantallas públicas de auth.
 * Evita texto invisible cuando `next-themes` pone `dark` en <html> pero el preview
 * o el CSS de variables HSL no aplica bien (p. ej. Simple Browser del IDE).
 */
export const authShellClass =
  "min-h-screen bg-zinc-50 p-6 text-zinc-950 antialiased dark:bg-zinc-50 dark:text-zinc-950";

export const authCardClass =
  "border border-zinc-200 bg-white text-zinc-950 shadow-lg dark:border-zinc-200 dark:bg-white dark:text-zinc-950";

export const authTitleClass = "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-900";

export const authMutedClass = "text-sm text-zinc-600 dark:text-zinc-600";

export const authLabelClass = "text-zinc-800 dark:text-zinc-800";

export const authInputClass =
  "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-300 dark:bg-white dark:text-zinc-900 dark:placeholder:text-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-600 dark:disabled:bg-zinc-100 dark:disabled:text-zinc-600";

export const authLinkClass = "text-teal-700 underline underline-offset-4 hover:text-teal-800 dark:text-teal-700 dark:hover:text-teal-800";

/** Marca JUXA — login oscuro (fijo, independiente del tema). */
export const juxaLoginCardClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl";

export const juxaLoginEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2ABDA8]";

export const juxaLoginTitleClass = "text-lg font-semibold uppercase tracking-[0.18em] text-white";

export const juxaLoginMutedClass = "text-sm font-light leading-relaxed text-zinc-400";

export const juxaLoginLabelClass =
  "text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500";

export const juxaLoginInputClass =
  "rounded-xl border border-white/12 bg-black/35 text-white placeholder:text-zinc-600 " +
  "focus-visible:border-[#2ABDA8]/45 focus-visible:ring-2 focus-visible:ring-[#2ABDA8]/15 " +
  "disabled:opacity-50";

export const juxaLoginLinkClass =
  "text-[13px] font-medium text-[#2ABDA8] underline-offset-4 transition hover:text-[#5ee4d4] hover:underline";

export const juxaLoginPrimaryButtonClass =
  "h-12 w-full rounded-xl border-0 bg-[#1d4ed8] text-xs font-semibold uppercase tracking-[0.2em] text-white " +
  "shadow-[0_12px_40px_-8px_rgba(29,78,216,0.55)] transition hover:bg-[#1e40af] " +
  "focus-visible:ring-2 focus-visible:ring-[#2ABDA8]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
