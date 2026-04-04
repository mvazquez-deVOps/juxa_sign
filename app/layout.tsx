import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppLayoutClient } from "@/components/app-layout-client";
import { TrialBanner } from "@/components/trial-banner";
import { dbOrganizationTrialForOrg } from "@/lib/data/repository";
import { isMemoryDataStore } from "@/lib/data/mode";
import { isOrganizationAdmin, panelRoleLabel, showsPanelSandboxHints } from "@/lib/roles";
import { DEMO_SYNTHETIC_USER_ID, resolveSession } from "@/lib/session";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Juxa Sign", template: "%s | Juxa Sign" },
  description: "Gestión de firmas electrónicas para equipos en México.",
  icons: { icon: "/favicon.svg" },
};

/** Evita que `next build` ejecute Prisma contra DB inexistente durante el prerender estático. */
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await resolveSession();
  const demoLogout =
    Boolean(process.env.DEMO_PASSWORD?.trim()) && Boolean(process.env.DEMO_AUTH_SECRET?.trim());

  const isDemoSynthetic = session?.user?.id === DEMO_SYNTHETIC_USER_ID;
  const sessionUser =
    !isDemoSynthetic && session?.user?.email != null && session.user.role != null
      ? { email: session.user.email, roleLabel: panelRoleLabel(session.user.role) }
      : null;
  const role = session?.user?.role;
  const showAdminNav = role != null && isOrganizationAdmin(role);
  const showSuperAdminNav = role === "SUPERADMIN";
  const consumerFolioNav = role === "USER";
  const panelReadOnlyNav = role === "VIEWER";
  const memoryDataStore = isMemoryDataStore();
  const memoryDevSubtitle =
    memoryDataStore && role != null && showsPanelSandboxHints(role);

  let trialBanner: ReactNode = null;
  if (session?.user?.organizationId && !isDemoSynthetic) {
    const orgTrial = await dbOrganizationTrialForOrg(session.user.organizationId);
    if (orgTrial?.trialEndsAt) {
      const expired = orgTrial.trialEndsAt.getTime() < Date.now();
      trialBanner = <TrialBanner trialEndsAt={orgTrial.trialEndsAt} expired={expired} />;
    }
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans`}>
        <AppLayoutClient
          demoLogout={demoLogout}
          sessionUser={sessionUser}
          showAdminNav={showAdminNav}
          showSuperAdminNav={showSuperAdminNav}
          consumerFolioNav={consumerFolioNav}
          panelReadOnlyNav={panelReadOnlyNav}
          memoryDataStore={memoryDataStore}
          memoryDevSubtitle={memoryDevSubtitle}
          trialBanner={trialBanner}
        >
          {children}
        </AppLayoutClient>
      </body>
    </html>
  );
}
