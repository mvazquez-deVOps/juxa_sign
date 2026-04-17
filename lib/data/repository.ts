import {
  Prisma,
  type FolioLedgerReason,
  type SigningJobStatus,
  type UserRole,
} from "@prisma/client";
import { evaluateSendReadinessFromEnviarShape } from "@/lib/send-readiness-eval";
import { isMemoryDataStore } from "@/lib/data/mode";
import { prisma } from "@/lib/prisma";
import {
  memoryApiKeyCreate,
  memoryApiKeyDelete,
  memoryApiKeyFindByHash,
  memoryApiKeyTouchUsed,
  memoryApiKeysList,
  memoryCertificateCreate,
  memoryCertificateFindFirst,
  memoryCompaniesFindMany,
  memoryCompaniesForOrg,
  memoryCompanyCreate,
  memoryCompanyFindFirstByDigidAndOrg,
  memoryCompanyFindFirstByIdAndOrg,
  memoryCounts,
  memoryDocumentCreate,
  memoryDocumentFindFirstByDigidId,
  memoryDocumentFindFirstInOrg,
  memoryDocumentNotifyContextByDigidId,
  memoryDocumentSignatoryReplace,
  memoryDocumentUpdate,
  memoryDocumentUpdateManyByDigidId,
  memoryDocumentsForBatchPicker,
  memoryDocumentsWithCompanyForOrg,
  memoryFindDocumentDetailInOrg,
  memoryFindDocumentInOrg,
  memoryFolioGrant,
  memoryFolioLedgerForUser,
  memoryFolioLedgerSuperadmin,
  memoryFolioPackCreate,
  memoryFolioPackDelete,
  memoryFolioPackUpdate,
  memoryFolioPacksListActive,
  memoryFolioPacksListAll,
  memoryFolioTryDebit,
  memoryHomeDashboardCountsForOrg,
  memoryNextDigidClient,
  memoryOrgAdminEmailsForNotify,
  memoryOrgInviteDelete,
  memoryOrgInviteDeleteByTokenHash,
  memoryOrgInviteFindByTokenHash,
  memoryOrgInvitesList,
  memoryOrgInviteUpsert,
  memoryOrgSettingsGet,
  memoryOrgSettingsUpsert,
  memoryOrgUserCount,
  memoryOrgUsersList,
  memoryOrganizationFindById,
  memoryOrganizationFindBySlug,
  memoryPlacementCreate,
  memoryPlacementDeleteManyForDocument,
  memoryPlacementsReorder,
  memoryRegisterOrganizationWithAdmin,
  memorySigningJobCreate,
  memorySigningJobFindByOrgRef,
  memorySigningJobUpdate,
  memorySigningJobsList,
  memorySignatoryDelete,
  memorySignatoryFindFirstInOrg,
  memorySignatoryFindManyByCompany,
  memorySignatoryFindManyByIds,
  memorySignatoryUpsert,
  memorySuperAdminDashboardCounts,
  memorySuperAdminFolioAggregatesSince,
  memorySuperAdminOrganizationById,
  memorySuperAdminOrganizationsList,
  memorySuperAdminOrganizationsListForAdminTable,
  memorySuperAdminUsageOverview,
  memorySuperAdminUsersSearch,
  memoryUserCreate,
  memoryUserFindByEmailGlobal,
  memoryUserFindById,
  memoryWebhookCreate,
  memoryWebhookEventsForOrg,
  memoryWebhookFindManyRecent,
  memoryWebhookFindPriorDuplicate,
  memoryWebhookUpdate,
} from "@/lib/store/memory-store";

/** Folios de bienvenida al alta self-service (ledger TRIAL_GRANT). Sin `trialEndsAt`: el envío solo depende del saldo. */
const SELF_SERVICE_WELCOME_FOLIOS = 1;

export type ApiKeyAuthContext = {
  organizationId: string;
  ownerUserId: string;
};

export type BatchPickerRow = {
  id: string;
  nameDoc: string;
  companyName: string;
  placementCount: number;
  signatoryLinkCount: number;
  ready: boolean;
  readinessMessage?: string;
};

const documentPlacementsSignatoriesArgs = Prisma.validator<Prisma.DocumentDefaultArgs>()({
  include: {
    company: true,
    placements: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: { signatory: true },
    },
  },
});

export type DocumentWithPlacementsAndSignatories = Prisma.DocumentGetPayload<
  typeof documentPlacementsSignatoriesArgs
>;

const documentEnviarArgs = Prisma.validator<Prisma.DocumentDefaultArgs>()({
  include: {
    company: true,
    signatories: { include: { signatory: true } },
    placements: true,
  },
});

export type DocumentForEnviarInOrg = Prisma.DocumentGetPayload<typeof documentEnviarArgs>;

function orgCompanyIdsFilter(organizationId: string): Prisma.DocumentWhereInput {
  return { company: { organizationId } };
}

// --- Auth / users ---

export async function dbUserFindUniqueWithOrg(email: string) {
  if (isMemoryDataStore()) {
    const row = memoryUserFindByEmailGlobal(email.trim().toLowerCase());
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      organizationId: row.organizationId,
      isRevoked: false,
    };
  }
  const p = prisma;
  return p.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      organizationId: true,
      isRevoked: true,
    },
  });
}

/** Lectura ligera para JWT/sesión (modo memoria: sin revocación persistente). */
export async function dbUserIsRevoked(userId: string): Promise<boolean> {
  if (isMemoryDataStore()) {
    return false;
  }
  const p = prisma;
  const row = await p.user.findUnique({ where: { id: userId }, select: { isRevoked: true } });
  return row?.isRevoked ?? false;
}

export async function dbUserFindByEmailGlobal(email: string) {
  if (isMemoryDataStore()) {
    return memoryUserFindByEmailGlobal(email.trim().toLowerCase());
  }
  const p = prisma;
  return p.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function dbUserFindInOrg(userId: string, organizationId: string) {
  if (isMemoryDataStore()) {
    const u = memoryUserFindById(userId);
    if (!u || u.organizationId !== organizationId) return null;
    return u;
  }
  const p = prisma;
  return p.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true, email: true, role: true, folioBalance: true },
  });
}

export async function dbUserBelongsToOrg(userId: string, organizationId: string): Promise<boolean> {
  if (isMemoryDataStore()) {
    const u = memoryUserFindById(userId);
    return Boolean(u && u.organizationId === organizationId);
  }
  const p = prisma;
  const n = await p.user.count({ where: { id: userId, organizationId } });
  return n > 0;
}

export async function dbUserFolioBalance(userId: string): Promise<number> {
  if (isMemoryDataStore()) {
    return memoryUserFindById(userId)?.folioBalance ?? 0;
  }
  const p = prisma;
  const u = await p.user.findUnique({ where: { id: userId }, select: { folioBalance: true } });
  return u?.folioBalance ?? 0;
}

export async function dbUserCreateFromInvite(data: {
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId: string;
}) {
  if (isMemoryDataStore()) {
    return memoryUserCreate({
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      organizationId: data.organizationId,
    });
  }
  const p = prisma;
  return p.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role,
      organizationId: data.organizationId,
    },
  });
}

export async function dbOrgUsersList(organizationId: string) {
  if (isMemoryDataStore()) return memoryOrgUsersList(organizationId);
  const p = prisma;
  return p.user.findMany({
    where: { organizationId },
    orderBy: { email: "asc" },
  });
}

export async function dbOrgUserCount(organizationId: string): Promise<number> {
  if (isMemoryDataStore()) return memoryOrgUserCount(organizationId);
  const p = prisma;
  return p.user.count({ where: { organizationId } });
}

// --- Organization ---

export async function dbOrganizationExists(organizationId: string): Promise<boolean> {
  if (isMemoryDataStore()) {
    return memoryOrganizationFindById(organizationId) != null;
  }
  const p = prisma;
  const n = await p.organization.count({ where: { id: organizationId } });
  return n > 0;
}

export async function dbRegisterSelfServiceOrganization(data: {
  name: string;
  slug: string;
  email: string;
  passwordHash: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isMemoryDataStore()) {
    try {
      if (memoryOrganizationFindBySlug(data.slug)) {
        return { ok: false, message: "Ese identificador de organización ya está en uso." };
      }
      memoryRegisterOrganizationWithAdmin({
        name: data.name,
        slug: data.slug,
        email: data.email,
        passwordHash: data.passwordHash,
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear la cuenta.";
      return { ok: false, message: msg };
    }
  }
  const p = prisma;
  const slug = data.slug.trim().toLowerCase();
  const email = data.email.trim().toLowerCase();
  const dupSlug = await p.organization.findUnique({ where: { slug }, select: { id: true } });
  if (dupSlug) return { ok: false, message: "Ese identificador de organización ya está en uso." };
  const dupEmail = await p.user.findUnique({ where: { email }, select: { id: true } });
  if (dupEmail) return { ok: false, message: "Ese correo ya está registrado." };

  try {
    await p.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name.trim(),
          slug,
        },
      });
      await tx.organizationSettings.create({
        data: {
          organizationId: org.id,
          displayName: null,
          maxUsers: null,
          maxMonthlySends: null,
          folioPremiumEnabled: false,
        },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: data.passwordHash,
          role: "ADMIN",
          organizationId: org.id,
          folioBalance: SELF_SERVICE_WELCOME_FOLIOS,
        },
      });
      await tx.folioLedgerEntry.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          delta: SELF_SERVICE_WELCOME_FOLIOS,
          balanceAfter: SELF_SERVICE_WELCOME_FOLIOS,
          reason: "TRIAL_GRANT",
          refType: null,
          refId: null,
          createdByUserId: null,
        },
      });
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo crear la organización. Intenta de nuevo." };
  }
}

// --- Org settings / invites / team ---

export async function dbOrgSettingsGet(organizationId: string) {
  if (isMemoryDataStore()) return memoryOrgSettingsGet(organizationId);
  const p = prisma;
  return p.organizationSettings.findUnique({ where: { organizationId } });
}

export async function dbOrgSettingsUpsertMaxUsers(organizationId: string, maxUsers: number | null) {
  if (isMemoryDataStore()) {
    memoryOrgSettingsUpsert({ organizationId, maxUsers });
    return;
  }
  const p = prisma;
  await p.organizationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      maxUsers,
      displayName: null,
      maxMonthlySends: null,
      folioPremiumEnabled: false,
    },
    update: { maxUsers },
  });
}

export async function dbOrganizationInviteEmailLabel(organizationId: string): Promise<string> {
  if (isMemoryDataStore()) {
    const s = memoryOrgSettingsGet(organizationId);
    const o = memoryOrganizationFindById(organizationId);
    const label = s?.displayName?.trim();
    return label || o?.name || "Tu organización";
  }
  const p = prisma;
  const [org, settings] = await Promise.all([
    p.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    p.organizationSettings.findUnique({
      where: { organizationId },
      select: { displayName: true },
    }),
  ]);
  const label = settings?.displayName?.trim();
  return label || org?.name || "Tu organización";
}

export async function dbOrgInvitesList(organizationId: string) {
  if (isMemoryDataStore()) return memoryOrgInvitesList(organizationId);
  const p = prisma;
  return p.organizationInvite.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function dbOrgInvitesCount(organizationId: string): Promise<number> {
  if (isMemoryDataStore()) {
    return memoryOrgInvitesList(organizationId).length;
  }
  const p = prisma;
  return p.organizationInvite.count({ where: { organizationId } });
}

export async function dbOrgInviteUpsert(data: {
  organizationId: string;
  email: string;
  role: UserRole;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId: string | null;
}) {
  if (isMemoryDataStore()) {
    return memoryOrgInviteUpsert(data);
  }
  const p = prisma;
  const emailLower = data.email.trim().toLowerCase();
  return p.organizationInvite.upsert({
    where: {
      organizationId_email: { organizationId: data.organizationId, email: emailLower },
    },
    create: {
      organizationId: data.organizationId,
      email: emailLower,
      role: data.role,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      invitedByUserId: data.invitedByUserId,
    },
    update: {
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      role: data.role,
      invitedByUserId: data.invitedByUserId,
    },
  });
}

export async function dbOrgInviteDelete(id: string, organizationId: string): Promise<boolean> {
  if (isMemoryDataStore()) return memoryOrgInviteDelete(id, organizationId);
  const p = prisma;
  const r = await p.organizationInvite.deleteMany({ where: { id, organizationId } });
  return r.count > 0;
}

export async function dbOrgInviteDeleteByTokenHash(tokenHash: string): Promise<boolean> {
  if (isMemoryDataStore()) return memoryOrgInviteDeleteByTokenHash(tokenHash);
  const p = prisma;
  const r = await p.organizationInvite.deleteMany({ where: { tokenHash } });
  return r.count > 0;
}

export async function dbOrgInviteFindByTokenHash(tokenHash: string) {
  if (isMemoryDataStore()) return memoryOrgInviteFindByTokenHash(tokenHash);
  const p = prisma;
  const inv = await p.organizationInvite.findFirst({
    where: { tokenHash },
    include: { organization: { select: { name: true } } },
  });
  if (!inv) return null;
  const { organization, ...inviteRest } = inv;
  return {
    invite: inviteRest,
    organizationName: organization.name,
  };
}

// --- Companies ---

export async function dbCompaniesFindManyByRazon(organizationId: string, dir: "asc" | "desc" = "asc") {
  if (isMemoryDataStore()) return memoryCompaniesForOrg(organizationId, "razonSocial", dir);
  const p = prisma;
  return p.company.findMany({
    where: { organizationId },
    orderBy: { razonSocial: dir },
  });
}

export async function dbCompaniesFindManyForList(organizationId: string, dir: "asc" | "desc" = "desc") {
  if (isMemoryDataStore()) return memoryCompaniesForOrg(organizationId, "createdAt", dir);
  const p = prisma;
  return p.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: dir },
  });
}

export async function dbCompanyFindFirstInOrg(id: string, organizationId: string) {
  if (isMemoryDataStore()) return memoryCompanyFindFirstByIdAndOrg(id, organizationId);
  const p = prisma;
  return p.company.findFirst({ where: { id, organizationId } });
}

export async function dbCompanyFindFirstByDigidInOrg(digidIdClient: number, organizationId: string) {
  if (isMemoryDataStore()) return memoryCompanyFindFirstByDigidAndOrg(digidIdClient, organizationId);
  const p = prisma;
  return p.company.findFirst({ where: { digidIdClient, organizationId } });
}

export async function dbCompanyCreate(data: {
  digidIdClient: number;
  razonSocial: string;
  rfc: string;
  email: string;
  organizationId: string;
}) {
  if (isMemoryDataStore()) {
    return memoryCompanyCreate({
      digidIdClient: data.digidIdClient,
      razonSocial: data.razonSocial,
      rfc: data.rfc,
      email: data.email,
      organizationId: data.organizationId,
    });
  }
  const p = prisma;
  return p.company.create({ data });
}

// --- Documents ---

export async function dbDocumentCreate(data: {
  companyId: string;
  digidDocumentId: number;
  nameDoc: string;
  urlDocumento: string | null;
}) {
  if (isMemoryDataStore()) {
    return memoryDocumentCreate({
      companyId: data.companyId,
      digidDocumentId: data.digidDocumentId,
      nameDoc: data.nameDoc,
      urlDocumento: data.urlDocumento,
    });
  }
  const p = prisma;
  return p.document.create({ data });
}

export async function dbDocumentUpdateStatus(id: string, status: string, lastStatusSyncAt: Date) {
  if (isMemoryDataStore()) {
    return memoryDocumentUpdate(id, { status, lastStatusSyncAt });
  }
  const p = prisma;
  return p.document.update({
    where: { id },
    data: { status, lastStatusSyncAt },
  });
}

export async function dbDocumentTouchLastStatusSync(id: string, lastStatusSyncAt: Date) {
  if (isMemoryDataStore()) {
    return memoryDocumentUpdate(id, { lastStatusSyncAt });
  }
  const p = prisma;
  return p.document.update({
    where: { id },
    data: { lastStatusSyncAt },
  });
}

export async function dbDocumentFindFirstInOrgWithCompany(documentId: string, organizationId: string) {
  if (isMemoryDataStore()) {
    return memoryDocumentFindFirstInOrg(documentId, organizationId, "company");
  }
  const p = prisma;
  return p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: { company: true },
  });
}

export async function dbDocumentFindFirstInOrgSelectId(documentId: string, organizationId: string) {
  if (isMemoryDataStore()) {
    const d = memoryDocumentFindFirstInOrg(documentId, organizationId);
    return d ? { id: d.id } : null;
  }
  const p = prisma;
  return p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    select: { id: true },
  });
}

export async function dbDocumentsFindManyForSync(organizationId: string, take: number) {
  if (isMemoryDataStore()) {
    const rows = memoryDocumentsWithCompanyForOrg(organizationId, "updatedAt", "desc");
    return rows.slice(0, take).map((d) => ({ id: d.id }));
  }
  const p = prisma;
  return p.document.findMany({
    where: orgCompanyIdsFilter(organizationId),
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true },
  });
}

export async function dbDocumentsFindManyWithCompany(
  organizationId: string,
  orderField: "createdAt" | "updatedAt",
  dir: "asc" | "desc",
) {
  if (isMemoryDataStore()) return memoryDocumentsWithCompanyForOrg(organizationId, orderField, dir);
  const p = prisma;
  return p.document.findMany({
    where: orgCompanyIdsFilter(organizationId),
    orderBy: { [orderField]: dir },
    include: { company: true },
  });
}

export async function dbDocumentFindFirstWithPlacementsAndSignatories(
  documentId: string,
  organizationId: string,
): Promise<DocumentWithPlacementsAndSignatories | null> {
  if (isMemoryDataStore()) {
    return memoryDocumentFindFirstInOrg(documentId, organizationId, "placements") as
      | DocumentWithPlacementsAndSignatories
      | null;
  }
  const p = prisma;
  return p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: documentPlacementsSignatoriesArgs.include,
  });
}

export async function dbDocumentFindFirstWithCompanyAndSignatoryLinks(
  documentId: string,
  organizationId: string,
) {
  if (isMemoryDataStore()) {
    return memoryDocumentFindFirstInOrg(documentId, organizationId, "signatories");
  }
  const p = prisma;
  return p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
    },
  });
}

export async function dbDocumentForEnviarInOrg(
  documentId: string,
  organizationId: string,
): Promise<DocumentForEnviarInOrg | null> {
  if (isMemoryDataStore()) {
    return memoryFindDocumentInOrg(documentId, organizationId) as DocumentForEnviarInOrg | null;
  }
  const p = prisma;
  return p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: documentEnviarArgs.include,
  });
}

export async function dbFindDocumentInOrg(documentId: string, organizationId: string) {
  if (isMemoryDataStore()) return memoryFindDocumentInOrg(documentId, organizationId);
  const p = prisma;
  const d = await p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
      placements: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      certificates: { orderBy: { createdAt: "desc" } },
    },
  });
  return d;
}

export async function dbFindDocumentDetailInOrg(documentId: string, organizationId: string) {
  if (isMemoryDataStore()) return memoryFindDocumentDetailInOrg(documentId, organizationId);
  const p = prisma;
  const d = await p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
      placements: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { signatory: true },
      },
      certificates: { orderBy: { createdAt: "desc" } },
    },
  });
  return d;
}

export async function dbDocumentFindFirstByDigidSelectStatus(digidDocumentId: number) {
  if (isMemoryDataStore()) return memoryDocumentFindFirstByDigidId(digidDocumentId);
  const p = prisma;
  return p.document.findUnique({
    where: { digidDocumentId },
    select: { status: true },
  });
}

export async function dbDocumentNotifyContextByDigidId(digidDocumentId: number) {
  if (isMemoryDataStore()) return memoryDocumentNotifyContextByDigidId(digidDocumentId);
  const p = prisma;
  const d = await p.document.findUnique({
    where: { digidDocumentId },
    select: {
      id: true,
      nameDoc: true,
      company: { select: { organizationId: true } },
    },
  });
  if (!d) return null;
  return {
    id: d.id,
    nameDoc: d.nameDoc,
    organizationId: d.company.organizationId,
  };
}

export async function dbDocumentUpdateManyStatusByDigid(digidDocumentId: number, status: string) {
  if (isMemoryDataStore()) return memoryDocumentUpdateManyByDigidId(digidDocumentId, status);
  const p = prisma;
  const r = await p.document.updateMany({ where: { digidDocumentId }, data: { status } });
  return r.count;
}

export async function dbDocumentSignatoryReplace(
  documentId: string,
  rows: { signatoryId: string; kyc: boolean }[],
) {
  if (isMemoryDataStore()) {
    memoryDocumentSignatoryReplace(documentId, rows);
    return;
  }
  const p = prisma;
  await p.$transaction([
    p.documentSignatory.deleteMany({ where: { documentId } }),
    p.documentSignatory.createMany({
      data: rows.map((r) => ({
        documentId,
        signatoryId: r.signatoryId,
        kyc: r.kyc,
      })),
    }),
  ]);
}

// --- Signatories ---

export async function dbSignatoryFindManyByCompany(companyId: string) {
  if (isMemoryDataStore()) return memorySignatoryFindManyByCompany(companyId);
  const p = prisma;
  return p.signatory.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function dbSignatoryFindManyByIds(ids: string[], companyId: string) {
  if (isMemoryDataStore()) return memorySignatoryFindManyByIds(ids, companyId);
  const p = prisma;
  return p.signatory.findMany({
    where: { id: { in: ids }, companyId },
  });
}

export async function dbSignatoryFindFirstInOrg(id: string, organizationId: string) {
  if (isMemoryDataStore()) return memorySignatoryFindFirstInOrg(id, organizationId);
  const p = prisma;
  return p.signatory.findFirst({
    where: {
      id,
      company: { organizationId },
    },
  });
}

export async function dbSignatoryUpsert(
  companyId: string,
  digidSignatoryId: number,
  data: Omit<
    Prisma.SignatoryUncheckedCreateInput,
    "id" | "companyId" | "digidSignatoryId" | "createdAt" | "updatedAt"
  >,
) {
  if (isMemoryDataStore()) {
    return memorySignatoryUpsert(companyId, digidSignatoryId, {
      name: data.name as string,
      email: (data.email as string | null) ?? null,
      phone: (data.phone as string | null) ?? null,
      rfc: (data.rfc as string | null) ?? null,
      isRepLegal: Boolean(data.isRepLegal),
      autoSign: Boolean(data.autoSign),
    });
  }
  const p = prisma;
  return p.signatory.upsert({
    where: {
      companyId_digidSignatoryId: { companyId, digidSignatoryId },
    },
    create: {
      companyId,
      digidSignatoryId,
      name: data.name as string,
      email: (data.email as string | null | undefined) ?? null,
      phone: (data.phone as string | null | undefined) ?? null,
      rfc: (data.rfc as string | null | undefined) ?? null,
      isRepLegal: Boolean(data.isRepLegal),
      autoSign: Boolean(data.autoSign),
    },
    update: {
      name: data.name as string,
      email: (data.email as string | null | undefined) ?? null,
      phone: (data.phone as string | null | undefined) ?? null,
      rfc: (data.rfc as string | null | undefined) ?? null,
      isRepLegal: Boolean(data.isRepLegal),
      autoSign: Boolean(data.autoSign),
    },
  });
}

export async function dbSignatoryDelete(id: string) {
  if (isMemoryDataStore()) {
    memorySignatoryDelete(id);
    return;
  }
  const p = prisma;
  await p.signatory.delete({ where: { id } });
}

// --- Placements ---

export async function dbPlacementCreate(data: {
  documentId: string;
  signatoryId: string;
  page: number;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
}) {
  if (isMemoryDataStore()) {
    return memoryPlacementCreate(data);
  }
  const p = prisma;
  const maxRow = await p.signaturePlacement.aggregate({
    where: { documentId: data.documentId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxRow._max.sortOrder ?? -1) + 1;
  return p.signaturePlacement.create({
    data: { ...data, sortOrder },
  });
}

export async function dbPlacementDeleteManyForDocument(documentId: string) {
  if (isMemoryDataStore()) {
    memoryPlacementDeleteManyForDocument(documentId);
    return;
  }
  const p = prisma;
  await p.signaturePlacement.deleteMany({ where: { documentId } });
}

export async function dbPlacementsReorder(
  documentId: string,
  organizationId: string,
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isMemoryDataStore()) return memoryPlacementsReorder(documentId, organizationId, orderedIds);
  const p = prisma;
  const doc = await p.document.findFirst({
    where: { id: documentId, ...orgCompanyIdsFilter(organizationId) },
    select: { id: true },
  });
  if (!doc) return { ok: false, message: "Documento no encontrado." };
  const existing = await p.signaturePlacement.findMany({
    where: { documentId },
    select: { id: true },
  });
  const idSet = new Set(existing.map((x) => x.id));
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return { ok: false, message: "La lista debe incluir todas las marcas del documento, sin duplicados." };
  }
  await p.$transaction(
    orderedIds.map((id, index) =>
      p.signaturePlacement.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  return { ok: true };
}

// --- Certificates ---

export async function dbCertificateCreate(data: {
  documentId: string;
  fileName: string | null;
  filePath: string | null;
  mimeType?: string;
}) {
  if (isMemoryDataStore()) {
    return memoryCertificateCreate({
      documentId: data.documentId,
      fileName: data.fileName,
      filePath: data.filePath,
      mimeType: data.mimeType ?? "application/pdf",
    });
  }
  const p = prisma;
  return p.certificate.create({
    data: {
      documentId: data.documentId,
      fileName: data.fileName,
      filePath: data.filePath,
      mimeType: data.mimeType ?? "application/pdf",
    },
  });
}

export async function dbCertificateFindFirstInOrg(id: string, organizationId: string) {
  if (isMemoryDataStore()) return memoryCertificateFindFirst(id, organizationId);
  const p = prisma;
  return p.certificate.findFirst({
    where: {
      id,
      document: orgCompanyIdsFilter(organizationId),
    },
  });
}

// --- Webhooks ---

export async function dbWebhookFindDuplicate(payloadHash: string, since: Date) {
  if (isMemoryDataStore()) {
    return memoryWebhookFindPriorDuplicate(payloadHash, since);
  }
  const p = prisma;
  return p.webhookEvent.findFirst({
    where: { payloadHash, receivedAt: { gte: since } },
    orderBy: { receivedAt: "asc" },
  });
}

export async function dbWebhookCreate(payload: string, payloadHash: string) {
  if (isMemoryDataStore()) {
    return memoryWebhookCreate({
      payload,
      payloadHash,
      receivedAt: new Date(),
      processed: false,
      documentDigidId: null,
      parsedStatus: null,
      parseError: null,
    });
  }
  const p = prisma;
  return p.webhookEvent.create({
    data: {
      payload,
      payloadHash,
      processed: false,
      documentDigidId: null,
      parsedStatus: null,
      parseError: null,
    },
  });
}

export async function dbWebhookUpdate(
  id: string,
  data: Partial<
    Pick<Prisma.WebhookEventUpdateInput, "processed" | "documentDigidId" | "parsedStatus" | "parseError">
  >,
) {
  if (isMemoryDataStore()) {
    return memoryWebhookUpdate(id, data as Parameters<typeof memoryWebhookUpdate>[1]);
  }
  const p = prisma;
  return p.webhookEvent.update({ where: { id }, data });
}

export async function dbWebhookEventsForOrganization(organizationId: string, take: number) {
  if (isMemoryDataStore()) return memoryWebhookEventsForOrg(organizationId, take);
  const p = prisma;
  const digidRows = await p.document.findMany({
    where: orgCompanyIdsFilter(organizationId),
    select: { digidDocumentId: true },
  });
  const ids = [...new Set(digidRows.map((d) => d.digidDocumentId))];
  if (ids.length === 0) return [];
  return p.webhookEvent.findMany({
    where: { documentDigidId: { in: ids } },
    orderBy: { receivedAt: "desc" },
    take,
  });
}

export async function dbOrgAdminEmailsForNotify(organizationId: string): Promise<string[]> {
  if (isMemoryDataStore()) return memoryOrgAdminEmailsForNotify(organizationId);
  const p = prisma;
  const users = await p.user.findMany({
    where: {
      organizationId,
      role: { in: ["ADMIN", "SUPERADMIN"] },
    },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

// --- API keys ---

export async function dbApiKeyFindByHash(keyHash: string): Promise<ApiKeyAuthContext | null> {
  if (isMemoryDataStore()) {
    const k = memoryApiKeyFindByHash(keyHash);
    if (!k) return null;
    return { organizationId: k.organizationId, ownerUserId: k.ownerUserId };
  }
  const p = prisma;
  const k = await p.apiKey.findFirst({ where: { keyHash } });
  if (!k) return null;
  return { organizationId: k.organizationId, ownerUserId: k.ownerUserId };
}

export async function dbApiKeyTouchUsed(keyHash: string) {
  if (isMemoryDataStore()) {
    memoryApiKeyTouchUsed(keyHash);
    return;
  }
  const p = prisma;
  await p.apiKey.updateMany({ where: { keyHash }, data: { lastUsedAt: new Date() } });
}

export async function dbApiKeysList(organizationId: string) {
  if (isMemoryDataStore()) {
    return memoryApiKeysList(organizationId).map((k) => ({
      ...k,
      ownerEmail: memoryUserFindById(k.ownerUserId)?.email ?? "—",
    }));
  }
  const p = prisma;
  const rows = await p.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { ownerUser: { select: { email: true } } },
  });
  return rows.map((k) => {
    const { ownerUser, ...rest } = k;
    return { ...rest, ownerEmail: ownerUser.email };
  });
}

export async function dbApiKeyCreate(data: {
  organizationId: string;
  ownerUserId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
}) {
  if (isMemoryDataStore()) return memoryApiKeyCreate(data);
  const p = prisma;
  return p.apiKey.create({ data });
}

export async function dbApiKeyDelete(id: string, organizationId: string): Promise<boolean> {
  if (isMemoryDataStore()) return memoryApiKeyDelete(id, organizationId);
  const p = prisma;
  try {
    await p.apiKey.delete({ where: { id, organizationId } });
    return true;
  } catch {
    return false;
  }
}

// --- Signing jobs ---

export async function dbSigningJobCreate(data: {
  organizationId: string;
  clientReference: string | null;
  payload: unknown;
}) {
  if (isMemoryDataStore()) {
    return memorySigningJobCreate(data);
  }
  const p = prisma;
  return p.signingJob.create({
    data: {
      organizationId: data.organizationId,
      clientReference: data.clientReference,
      payload: data.payload as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });
}

export async function dbSigningJobFindByOrgRef(organizationId: string, clientReference: string) {
  if (isMemoryDataStore()) return memorySigningJobFindByOrgRef(organizationId, clientReference);
  const p = prisma;
  return p.signingJob.findUnique({
    where: {
      organizationId_clientReference: { organizationId, clientReference },
    },
  });
}

export async function dbSigningJobUpdate(
  id: string,
  data: Partial<Pick<{ status: SigningJobStatus; result: unknown; errorMessage: string | null }, "status" | "result" | "errorMessage">>,
) {
  if (isMemoryDataStore()) {
    return memorySigningJobUpdate(id, data);
  }
  const p = prisma;
  return p.signingJob.update({
    where: { id },
    data: {
      ...data,
      result:
        data.result === undefined
          ? undefined
          : (data.result as Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined),
    },
  });
}

export async function dbSigningJobsList(organizationId: string, take: number) {
  if (isMemoryDataStore()) return memorySigningJobsList(organizationId, take);
  const p = prisma;
  return p.signingJob.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

// --- Folios ---

export async function dbFolioTryDebitForSend(params: {
  userId: string;
  organizationId: string;
  cost: number;
  reason: FolioLedgerReason;
  refType?: string | null;
  refId?: string | null;
  createdByUserId: string | null;
}) {
  if (isMemoryDataStore()) {
    return memoryFolioTryDebit({
      userId: params.userId,
      organizationId: params.organizationId,
      cost: params.cost,
      reason: params.reason,
      refType: params.refType,
      refId: params.refId,
      createdByUserId: params.createdByUserId,
    });
  }
  const p = prisma;
  try {
    return await p.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: params.userId, organizationId: params.organizationId },
      });
      if (!user) {
        return {
          ok: false as const,
          message:
            "Usuario no encontrado en esta organización. Si cambiaste de cuenta, modo memoria/Postgres o reiniciaste el servidor, cierra sesión y vuelve a entrar.",
        };
      }
      if (user.folioBalance < params.cost) {
        return {
          ok: false as const,
          message: `Saldo insuficiente: tienes ${user.folioBalance} crédito(s) y se requieren ${params.cost}.`,
        };
      }
      const balanceAfter = user.folioBalance - params.cost;
      await tx.user.update({
        where: { id: user.id },
        data: { folioBalance: balanceAfter },
      });
      await tx.folioLedgerEntry.create({
        data: {
          userId: params.userId,
          organizationId: params.organizationId,
          delta: -params.cost,
          balanceAfter,
          reason: params.reason,
          refType: params.refType ?? null,
          refId: params.refId ?? null,
          createdByUserId: params.createdByUserId,
        },
      });
      return { ok: true as const, balanceAfter };
    });
  } catch {
    return { ok: false as const, message: "No se pudo registrar el débito de folios." };
  }
}

export async function dbFolioGrantCredits(params: {
  userId: string;
  delta: number;
  reason: FolioLedgerReason;
  createdByUserId: string | null;
}): Promise<{ ok: true; balanceAfter: number } | { ok: false; message: string }> {
  if (isMemoryDataStore()) {
    const u = memoryUserFindById(params.userId);
    if (!u) return { ok: false, message: "Usuario no encontrado." };
    return memoryFolioGrant({
      userId: params.userId,
      organizationId: u.organizationId,
      delta: params.delta,
      reason: params.reason,
      createdByUserId: params.createdByUserId,
    });
  }
  if (params.delta <= 0) {
    return { ok: false, message: "El monto debe ser positivo." };
  }
  const p = prisma;
  try {
    return await p.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: params.userId } });
      if (!user) return { ok: false as const, message: "Usuario no encontrado." };
      const balanceAfter = user.folioBalance + params.delta;
      await tx.user.update({
        where: { id: user.id },
        data: { folioBalance: balanceAfter },
      });
      await tx.folioLedgerEntry.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          delta: params.delta,
          balanceAfter,
          reason: params.reason,
          refType: null,
          refId: null,
          createdByUserId: params.createdByUserId,
        },
      });
      return { ok: true as const, balanceAfter };
    });
  } catch {
    return { ok: false, message: "No se pudo acreditar folios." };
  }
}

export async function dbFolioLedgerForUser(userId: string, take: number) {
  if (isMemoryDataStore()) return memoryFolioLedgerForUser(userId, take);
  const p = prisma;
  return p.folioLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function dbFolioLedgerSuperadmin(
  filters: { userId?: string; organizationId?: string },
  take: number,
) {
  if (isMemoryDataStore()) return memoryFolioLedgerSuperadmin(filters, take);
  const p = prisma;
  return p.folioLedgerEntry.findMany({
    where: {
      userId: filters.userId,
      organizationId: filters.organizationId,
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { email: true } } },
  });
}

export async function dbFolioPacksListActive() {
  if (isMemoryDataStore()) return memoryFolioPacksListActive();
  const p = prisma;
  return p.folioPack.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function dbFolioPacksListAll() {
  if (isMemoryDataStore()) return memoryFolioPacksListAll();
  const p = prisma;
  return p.folioPack.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function dbFolioPackCreate(data: {
  slug: string;
  name: string;
  description: string | null;
  folioAmount: number;
  priceMxn: string;
  sortOrder: number;
  active: boolean;
}) {
  if (isMemoryDataStore()) {
    return memoryFolioPackCreate(data);
  }
  const p = prisma;
  const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
  const dup = await p.folioPack.findUnique({ where: { slug } });
  if (dup) throw new Error("slug_duplicado");
  return p.folioPack.create({
    data: {
      slug,
      name: data.name.trim(),
      description: data.description,
      folioAmount: data.folioAmount,
      priceMxn: data.priceMxn,
      sortOrder: data.sortOrder,
      active: data.active,
    },
  });
}

export async function dbFolioPackUpdate(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    folioAmount: number;
    priceMxn: string;
    sortOrder: number;
    active: boolean;
  }>,
) {
  if (isMemoryDataStore()) return memoryFolioPackUpdate(id, data);
  const p = prisma;
  const row = await p.folioPack.findUnique({ where: { id } });
  if (!row) return null;
  return p.folioPack.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      description: data.description,
      folioAmount: data.folioAmount,
      priceMxn: data.priceMxn,
      sortOrder: data.sortOrder,
      active: data.active,
    },
  });
}

export async function dbFolioPackDelete(id: string): Promise<boolean> {
  if (isMemoryDataStore()) return memoryFolioPackDelete(id);
  const p = prisma;
  try {
    await p.folioPack.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// --- Dashboard ---

export async function dbHomeDashboardCounts(organizationId: string) {
  if (isMemoryDataStore()) return memoryHomeDashboardCountsForOrg(organizationId);
  const p = prisma;
  const companies = await p.company.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const ids = companies.map((c) => c.id);
  if (ids.length === 0) {
    return { companies: 0, signatories: 0, documents: 0, placements: 0 };
  }
  const [signatories, documents, placements] = await Promise.all([
    p.signatory.count({ where: { companyId: { in: ids } } }),
    p.document.count({ where: { companyId: { in: ids } } }),
    p.signaturePlacement.count({
      where: { document: { companyId: { in: ids } } },
    }),
  ]);
  return {
    companies: ids.length,
    signatories,
    documents,
    placements,
  };
}

// --- Batch picker ---

export async function dbDocumentsForBatchPicker(organizationId: string): Promise<BatchPickerRow[]> {
  if (isMemoryDataStore()) return memoryDocumentsForBatchPicker(organizationId);
  const p = prisma;
  const docs = await p.document.findMany({
    where: orgCompanyIdsFilter(organizationId),
    orderBy: { updatedAt: "desc" },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
      placements: true,
    },
  });
  return docs.map((d) => {
    const readiness = evaluateSendReadinessFromEnviarShape({
      placements: d.placements.map((pl) => ({ signatoryId: pl.signatoryId })),
      signatories: d.signatories.map((ds) => ({
        signatoryId: ds.signatoryId,
        signatory: {
          name: ds.signatory.name,
          email: ds.signatory.email,
          phone: ds.signatory.phone,
        },
      })),
    });
    return {
      id: d.id,
      nameDoc: d.nameDoc,
      companyName: d.company.razonSocial,
      placementCount: d.placements.length,
      signatoryLinkCount: d.signatories.length,
      ready: readiness.ready,
      readinessMessage: readiness.ready ? undefined : readiness.message,
    };
  });
}

// --- Superadmin ---

export async function dbSuperAdminDashboardCounts() {
  if (isMemoryDataStore()) return memorySuperAdminDashboardCounts();
  const p = prisma;
  const [organizations, users, documents, companyCount] = await Promise.all([
    p.organization.count(),
    p.user.count(),
    p.document.count(),
    p.company.count({ where: { organizationId: { not: null } } }),
  ]);
  return { organizations, users, companies: companyCount, documents };
}

export async function dbSuperAdminOrganizationsList() {
  if (isMemoryDataStore()) return memorySuperAdminOrganizationsList();
  const p = prisma;
  return p.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, companies: true },
      },
    },
  });
}

export async function dbSuperAdminOrganizationsListForAdminTable() {
  if (isMemoryDataStore()) return memorySuperAdminOrganizationsListForAdminTable();
  const p = prisma;
  const orgs = await p.organization.findMany({ orderBy: { createdAt: "desc" } });
  const rows = await Promise.all(
    orgs.map(async (org) => {
      const [userCount, companyCount, agg] = await Promise.all([
        p.user.count({ where: { organizationId: org.id } }),
        p.company.count({ where: { organizationId: org.id } }),
        p.user.aggregate({
          where: { organizationId: org.id },
          _sum: { folioBalance: true },
        }),
      ]);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        trialEndsAt: org.trialEndsAt,
        userCount,
        companyCount,
        totalFolioBalance: agg._sum.folioBalance ?? 0,
      };
    }),
  );
  return rows;
}

export async function dbSuperAdminOrganizationById(id: string) {
  if (isMemoryDataStore()) return memorySuperAdminOrganizationById(id);
  const p = prisma;
  const org = await p.organization.findUnique({
    where: { id },
    include: {
      settings: true,
      _count: { select: { users: true, companies: true } },
    },
  });
  if (!org) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    trialEndsAt: org.trialEndsAt,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    settings: org.settings,
    _count: org._count,
  };
}

export async function dbSuperAdminOrgSettingsSave(
  organizationId: string,
  data: {
    displayName: string | null;
    maxUsers: number | null;
    maxMonthlySends: number | null;
    folioPremiumEnabled: boolean;
  },
) {
  if (isMemoryDataStore()) {
    memoryOrgSettingsUpsert({
      organizationId,
      displayName: data.displayName,
      maxUsers: data.maxUsers,
      maxMonthlySends: data.maxMonthlySends,
      folioPremiumEnabled: data.folioPremiumEnabled,
    });
    return;
  }
  const p = prisma;
  await p.organizationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      displayName: data.displayName,
      maxUsers: data.maxUsers,
      maxMonthlySends: data.maxMonthlySends,
      folioPremiumEnabled: data.folioPremiumEnabled,
    },
    update: {
      displayName: data.displayName,
      maxUsers: data.maxUsers,
      maxMonthlySends: data.maxMonthlySends,
      folioPremiumEnabled: data.folioPremiumEnabled,
    },
  });
}

export async function dbSuperAdminUsersSearch(q: string, take: number) {
  if (isMemoryDataStore()) return memorySuperAdminUsersSearch(q, take);
  const p = prisma;
  const term = q.trim();
  const users = await p.user.findMany({
    where: term
      ? {
          OR: [{ email: { contains: term, mode: "insensitive" } }, { id: term }],
        }
      : undefined,
    orderBy: { email: "asc" },
    take,
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      folioBalance: true,
    },
  });
  return users;
}

export async function dbSuperAdminFolioAggregatesSince(since: Date) {
  if (isMemoryDataStore()) return memorySuperAdminFolioAggregatesSince(since);
  const p = prisma;
  const rows = await p.folioLedgerEntry.groupBy({
    by: ["reason"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    _sum: { delta: true },
  });
  return rows.map((r) => ({
    reason: r.reason,
    entryCount: r._count.id,
    sumDelta: r._sum.delta ?? 0,
  }));
}

export async function dbSuperAdminUsageOverview() {
  if (isMemoryDataStore()) {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return memorySuperAdminUsageOverview(since30, since7);
  }
  const p = prisma;
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [organizationCount, orgsRecent, ledger7, sendRows] = await Promise.all([
    p.organization.count(),
    p.organization.count({ where: { createdAt: { gte: since30 } } }),
    p.folioLedgerEntry.findMany({
      where: { createdAt: { gte: since7 } },
      select: { id: true },
    }),
    p.folioLedgerEntry.findMany({
      where: {
        createdAt: { gte: since30 },
        reason: { in: ["SEND_STANDARD", "SEND_PREMIUM"] },
      },
      select: { organizationId: true, delta: true },
    }),
  ]);

  const orgsWithSend = new Set(sendRows.map((r) => r.organizationId));
  const sendDeltaSum = sendRows.reduce((s, r) => s + r.delta, 0);

  return {
    organizationCount,
    organizationsCreatedLast30Days: orgsRecent,
    distinctOrgsWithSendsLast30Days: orgsWithSend.size,
    folioLedgerLinesLast7Days: ledger7.length,
    estimatedFoliosConsumedLast30Days: sendDeltaSum >= 0 ? 0 : Math.abs(sendDeltaSum),
  };
}
