"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <NextTopLoader color="hsl(var(--primary))" height={3} showSpinner={false} />
        {children}
        <Toaster richColors position="top-center" closeButton />
      </ThemeProvider>
    </SessionProvider>
  );
}
