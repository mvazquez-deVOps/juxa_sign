"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <Providers>
      <AppShell pathname={pathname}>{children}</AppShell>
    </Providers>
  );
}
