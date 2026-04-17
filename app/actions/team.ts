"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMemoryDataStore } from "@/lib/data/mode";
import {
  dbOrganizationInviteEmailLabel,
  dbOrgInviteDelete,
  dbOrgInviteDeleteByTokenHash,
  dbOrgInviteFindByTokenHash,
  dbOrgInviteUpsert,
  dbOrgInvitesCount,
  dbOrgSettingsGet,
  dbOrgSettingsUpsertMaxUsers,
  dbOrgUserCount,
  dbUserCreateFromInvite,
  dbUserFindByEmailGlobal,
} from "@/lib/data/repository";
import { sendTeamInviteEmail } from "@/lib/mail/send-transactional";
import { generateRawInviteToken, hashInviteToken } from "@/lib/invite-token";
import { requireOrgContext } from "@/lib/org-scope";
import { isOrganizationAdmin, panelRoleLabel } from "@/lib/roles";
import { resolveSession } from "@/lib/session";

const INVITE_EXPIRY_DAYS = 7;

function inviteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

async function requireAdmin(): Promise<{ organizationId: string; userId: string } | { error: string }> {
  const ctx = await requireOrgContext();
  if (!isOrganizationAdmin(ctx.role)) {
    return { error: "Solo administradores pueden gestionar el equipo." };
  }
  const session = await resolveSession();
  const userId = session?.user?.id;
  if (!userId) return { error: "Sesión inválida." };
  return { organizationId: ctx.organizationId, userId };
}

async function seatCheckForNewInvite(organizationId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await dbOrgSettingsGet(organizationId);
  const max = settings?.maxUsers ?? null;
  if (max == null || max <= 0) return { ok: true };
  const users = await dbOrgUserCount(organizationId);
  const pending = await dbOrgInvitesCount(organizationId);
  if (users + pending >= max) {
    return {
      ok: false,
      message: `Límite de usuarios (${max}) alcanzado. Revoca invitaciones pendientes o aumenta el límite.`,
    };
  }
  return { ok: true };
}

export type TeamInviteState = {
  ok: boolean;
  message?: string;
  inviteUrl?: string;
  /** true si el proveedor de correo envió el mensaje (Resend/SMTP). */
  inviteEmailSent?: boolean;
  inviteEmailError?: string;
};

const inviteSchema = z.object({
  email: z.string().email("Correo inválido"),
  role: z.enum(["OPERATOR", "VIEWER", "ADMIN", "USER"]),
});

export async function createOrganizationInvite(
  _prev: TeamInviteState | null,
  formData: FormData,
): Promise<TeamInviteState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, message: admin.error };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await dbUserFindByEmailGlobal(email);
  if (existing) {
    if (existing.organizationId === admin.organizationId) {
      return { ok: false, message: "Ese correo ya es miembro de la organización." };
    }
    return { ok: false, message: "Ese correo ya está registrado en otra organización." };
  }

  const seats = await seatCheckForNewInvite(admin.organizationId);
  if (!seats.ok) return { ok: false, message: seats.message };

  const plain = generateRawInviteToken();
  const tokenHash = hashInviteToken(plain);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  await dbOrgInviteUpsert({
    organizationId: admin.organizationId,
    email,
    role: parsed.data.role as UserRole,
    tokenHash,
    expiresAt,
    invitedByUserId: admin.userId,
  });

  revalidatePath("/configuracion/equipo");
  const inviteUrl = `${inviteBaseUrl()}/invitacion/${plain}`;
  const provider = (process.env.MAIL_PROVIDER || "none").trim().toLowerCase();
  const mailConfigured = provider === "resend" || provider === "smtp";

  if (!mailConfigured) {
    return {
      ok: true,
      inviteUrl,
      inviteEmailSent: false,
      message:
        "Invitación creada. Copia el enlace y compártelo por un canal seguro. Con MAIL_PROVIDER=resend (o smtp) el invitado también recibe el enlace por correo.",
    };
  }

  const orgLabel = await dbOrganizationInviteEmailLabel(admin.organizationId);
  const roleLabel = panelRoleLabel(parsed.data.role as UserRole);
  const mailRes = await sendTeamInviteEmail({
    to: email,
    inviteUrl,
    organizationLabel: orgLabel,
    roleLabel,
  });

  if (mailRes.ok) {
    return {
      ok: true,
      inviteUrl,
      inviteEmailSent: true,
      message: `Invitación creada. Se envió un correo a ${email} con el enlace; también puedes copiarlo abajo.`,
    };
  }
  return {
    ok: true,
    inviteUrl,
    inviteEmailSent: false,
    inviteEmailError: mailRes.error,
    message: `Invitación creada. No se pudo enviar el correo (${mailRes.error}). Copia el enlace y compártelo por un canal seguro.`,
  };
}

export type TeamRevokeState = { ok: boolean; message?: string };

export type RevokeMemberAccessResult = { ok: true; message?: string } | { ok: false; message: string };

const revokeMemberUserIdSchema = z.string().min(1).max(128);

/**
 * Revoca el acceso al panel de un miembro: marca `isRevoked` y deja el rol en USER.
 * Solo administradores de la organización (ADMIN o SUPERADMIN). No elimina el registro.
 */
export async function revokeMemberAccess(userId: string): Promise<RevokeMemberAccessResult> {
  const parsedId = revokeMemberUserIdSchema.safeParse(userId);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador de usuario inválido." };
  }

  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, message: admin.error };

  if (isMemoryDataStore()) {
    return { ok: false, message: "Revocar miembros no está disponible en el almacén en memoria." };
  }

  const targetId = parsedId.data;
  if (targetId === admin.userId) {
    return { ok: false, message: "No puedes revocar tu propio acceso." };
  }

  const target = await prisma.user.findFirst({
    where: { id: targetId, organizationId: admin.organizationId },
    select: { id: true, role: true, isRevoked: true },
  });

  if (!target) {
    return { ok: false, message: "Usuario no encontrado en esta organización." };
  }

  if (target.isRevoked) {
    return { ok: false, message: "El acceso de este usuario ya estaba revocado." };
  }

  if (target.role === "ADMIN" || target.role === "SUPERADMIN") {
    const otherAdmins = await prisma.user.count({
      where: {
        organizationId: admin.organizationId,
        isRevoked: false,
        role: { in: ["ADMIN", "SUPERADMIN"] },
        id: { not: targetId },
      },
    });
    if (otherAdmins === 0) {
      return { ok: false, message: "No puedes revocar al único administrador de la organización." };
    }
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { isRevoked: true, role: "USER" },
  });

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/equipo");
  return { ok: true, message: "Acceso del miembro revocado." };
}

export async function revokeOrganizationInvite(
  _prev: TeamRevokeState | null,
  formData: FormData,
): Promise<TeamRevokeState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, message: admin.error };

  const id = typeof formData.get("inviteId") === "string" ? (formData.get("inviteId") as string) : "";
  if (!id) return { ok: false, message: "Invitación inválida." };

  const ok = await dbOrgInviteDelete(id, admin.organizationId);
  if (!ok) return { ok: false, message: "No se pudo revocar la invitación." };
  revalidatePath("/configuracion/equipo");
  return { ok: true, message: "Invitación revocada." };
}

export type OrgLimitsState = { ok: boolean; message?: string };

export async function updateOrganizationMaxUsers(
  _prev: OrgLimitsState | null,
  formData: FormData,
): Promise<OrgLimitsState> {
  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, message: admin.error };

  const raw = formData.get("maxUsers");
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  let maxUsers: number | null = null;
  if (trimmed !== "") {
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(n) || n < 1 || n > 10_000) {
      return {
        ok: false,
        message: "Usa un número entre 1 y 10000, o déjalo vacío (sin límite).",
      };
    }
    maxUsers = n;
  }

  await dbOrgSettingsUpsertMaxUsers(admin.organizationId, maxUsers);
  revalidatePath("/configuracion/equipo");
  return { ok: true, message: "Límite actualizado." };
}

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirm: z.string().min(8),
});

export type AcceptInviteState = { ok: boolean; message?: string };

export async function acceptOrganizationInvite(
  _prev: AcceptInviteState | null,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return { ok: false, message: "Las contraseñas no coinciden." };
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const row = await dbOrgInviteFindByTokenHash(tokenHash);
  if (!row) {
    return { ok: false, message: "Enlace inválido o ya utilizado." };
  }
  const { invite } = row;
  if (invite.expiresAt.getTime() < Date.now()) {
    await dbOrgInviteDeleteByTokenHash(tokenHash);
    return { ok: false, message: "Esta invitación expiró. Solicita una nueva." };
  }

  const settings = await dbOrgSettingsGet(invite.organizationId);
  const max = settings?.maxUsers ?? null;
  const users = await dbOrgUserCount(invite.organizationId);
  if (max != null && max > 0 && users >= max) {
    return {
      ok: false,
      message: "La organización alcanzó su límite de usuarios. Contacta a un administrador.",
    };
  }

  const taken = await dbUserFindByEmailGlobal(invite.email);
  if (taken) {
    return { ok: false, message: "Ese correo ya tiene cuenta. Inicia sesión con tu usuario existente." };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await dbUserCreateFromInvite({
    email: invite.email,
    passwordHash,
    role: invite.role,
    organizationId: invite.organizationId,
  });
  await dbOrgInviteDeleteByTokenHash(tokenHash);

  return { ok: true, message: "Cuenta creada. Ya puedes iniciar sesión." };
}
