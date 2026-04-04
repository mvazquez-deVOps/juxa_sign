"use client";

import { signOut } from "next-auth/react";

export type SessionUserChip = { email: string; roleLabel: string };

export function SidebarSessionBlock({
  sessionUser,
  demoLogout,
}: {
  sessionUser: SessionUserChip | null;
  demoLogout?: boolean;
}) {
  const showNextAuth = Boolean(sessionUser);
  const showDemoLogout = Boolean(demoLogout) && !showNextAuth;

  return (
    <div className="space-y-3 border-t p-4">
      {showNextAuth ? (
        <div className="space-y-1">
          <p className="truncate text-xs text-muted-foreground" title={sessionUser!.email}>
            {sessionUser!.email}
          </p>
          <p className="text-xs font-medium text-foreground">Rol: {sessionUser!.roleLabel}</p>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
      {showDemoLogout ? (
        <form action="/api/demo-auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Cerrar sesión (demo)
          </button>
        </form>
      ) : null}
    </div>
  );
}
