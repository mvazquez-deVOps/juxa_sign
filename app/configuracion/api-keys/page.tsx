import Link from "next/link";
import { dbApiKeysList, dbOrgUsersList } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { requireAdminContext } from "@/lib/org-scope";
import { canAssignFolioWalletToApiKey } from "@/lib/roles";
import { resolveSession } from "@/lib/session";
import { ApiKeysClient } from "./api-keys-client";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const { organizationId } = await requireAdminContext();
  const session = await resolveSession();
  const currentUserId = session?.user?.id ?? "";

  const keysRaw = await dbApiKeysList(organizationId);
  const keys = keysRaw.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    ownerEmail: k.ownerEmail,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  }));

  const walletUsers = (await dbOrgUsersList(organizationId))
    .filter((u) => canAssignFolioWalletToApiKey(u.role))
    .map((u) => ({ id: u.id, email: u.email }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API keys</h1>
          <p className="text-muted-foreground">
            Claves para automatizar envíos vía{" "}
            <code className="rounded bg-muted px-1 text-xs">POST /api/v1/batch/send</code>. Cada clave descuenta
            folios de la cartera del usuario que elijas. Usa{" "}
            <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer</code> o{" "}
            <code className="rounded bg-muted px-1 text-xs">X-Api-Key</code>. No compartas ni expongas la clave en el
            navegador.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/configuracion">Volver</Link>
        </Button>
      </div>
      <ApiKeysClient initialKeys={keys} walletUsers={walletUsers} defaultOwnerUserId={currentUserId} />
    </div>
  );
}
