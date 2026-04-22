import Link from "next/link";
import { notFound } from "next/navigation";
import {
  juxaLoginCardClass,
  juxaLoginHeroH1Class,
  juxaLoginHeroSpanMutedClass,
  juxaLoginLinkClass,
  juxaLoginMutedClass,
} from "@/components/auth-page-styles";
import { JuxaLoginShell } from "@/components/juxa-login-shell";
import { isMemoryDataStore } from "@/lib/data/mode";
import { dbOrgInviteFindByTokenHash } from "@/lib/data/repository";
import { hashInviteToken } from "@/lib/invite-token";
import { panelRoleLabel } from "@/lib/roles";
import { InvitacionAcceptClient } from "./invitacion-client";

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitacionPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const tokenHash = hashInviteToken(token);
  const row = await dbOrgInviteFindByTokenHash(tokenHash);
  if (!row) {
    return (
      <JuxaLoginShell
        heroTitle={
          <h1 className={juxaLoginHeroH1Class}>
            <span className="font-semibold">Enlace no disponible</span>
            <span className={juxaLoginHeroSpanMutedClass}> — la invitación ya no es válida.</span>
          </h1>
        }
        heroLead={<p>Pide a un administrador de tu organización un enlace nuevo.</p>}
      >
        <div className={juxaLoginCardClass}>
          <p className={juxaLoginMutedClass}>
            Este enlace no es válido o ya fue usado. Pide a un administrador que genere una nueva invitación.
          </p>
          <p className="mt-6">
            <Link href="/login" className={juxaLoginLinkClass}>
              Ir al inicio de sesión
            </Link>
          </p>
        </div>
      </JuxaLoginShell>
    );
  }
  if (row.invite.expiresAt.getTime() < Date.now()) {
    return (
      <JuxaLoginShell
        heroTitle={
          <h1 className={juxaLoginHeroH1Class}>
            <span className="font-semibold">Invitación expirada</span>
            <span className={juxaLoginHeroSpanMutedClass}> — solicita un enlace actualizado.</span>
          </h1>
        }
        heroLead={<p>Las invitaciones caducan por seguridad; tu admin puede enviarte otra.</p>}
      >
        <div className={juxaLoginCardClass}>
          <p className={juxaLoginMutedClass}>
            Esta invitación expiró. Solicita un nuevo enlace al administrador de tu organización.
          </p>
          <p className="mt-6">
            <Link href="/login" className={juxaLoginLinkClass}>
              Ir al inicio de sesión
            </Link>
          </p>
        </div>
      </JuxaLoginShell>
    );
  }

  return (
    <InvitacionAcceptClient
      email={row.invite.email}
      token={token}
      memoryMode={isMemoryDataStore()}
      organizationName={row.organizationName}
      roleLabel={panelRoleLabel(row.invite.role)}
    />
  );
}
