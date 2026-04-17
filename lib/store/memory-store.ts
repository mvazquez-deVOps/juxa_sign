import bcrypt from "bcryptjs";
import type { FolioLedgerReason, UserRole } from "@prisma/client";
import { appBaseUrl } from "@/lib/app-base-url";
import { evaluateSendReadinessFromEnviarShape } from "@/lib/send-readiness-eval";
import {
  getMemoryOperatorUserEmail,
  getMemoryOperatorUserPasswordPlain,
  getMemoryPanelUserEmail,
  getMemoryPanelUserPasswordPlain,
  getMemorySandboxUserEmail,
  getMemorySandboxUserPasswordPlain,
  getMemoryViewerUserEmail,
  getMemoryViewerUserPasswordPlain,
} from "@/lib/memory-panel-credentials";

/** Compatible con zod `string().cuid()` (`/^c[^\s-]{8,}$/i`). Sin paquete `cuid` (su build “browser” usa `navigator` y rompe SSR/middleware). */
function memCuid(): string {
  const t = Date.now().toString(36);
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const r = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `c${t}${r}`;
}

export type MemoryOrganization = {
  id: string;
  name: string;
  slug: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId: string;
  folioBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryCompany = {
  id: string;
  digidIdClient: number;
  razonSocial: string;
  rfc: string;
  email: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemorySignatory = {
  id: string;
  companyId: string;
  digidSignatoryId: number;
  name: string;
  email: string | null;
  phone: string | null;
  rfc: string | null;
  isRepLegal: boolean;
  autoSign: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryDocument = {
  id: string;
  companyId: string;
  digidDocumentId: number;
  nameDoc: string;
  urlDocumento: string | null;
  status: string | null;
  lastStatusSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryDocumentSignatory = {
  id: string;
  documentId: string;
  signatoryId: string;
  kyc: boolean;
};

export type MemorySignaturePlacement = {
  id: string;
  documentId: string;
  signatoryId: string;
  page: number;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  sortOrder: number;
  createdAt: Date;
};

export type MemoryWebhookEvent = {
  id: string;
  payload: string;
  payloadHash: string | null;
  receivedAt: Date;
  processed: boolean;
  documentDigidId: number | null;
  parsedStatus: string | null;
  parseError: string | null;
};

export type MemoryCertificate = {
  id: string;
  documentId: string;
  fileName: string | null;
  filePath: string | null;
  mimeType: string;
  createdAt: Date;
};

export type MemoryOrganizationInvite = {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId: string | null;
  createdAt: Date;
};

export type MemoryOrganizationSettings = {
  organizationId: string;
  displayName: string | null;
  maxUsers: number | null;
  maxMonthlySends: number | null;
  folioPremiumEnabled: boolean;
  updatedAt: Date;
};

export type MemoryFolioLedgerEntry = {
  id: string;
  userId: string;
  organizationId: string;
  delta: number;
  balanceAfter: number;
  reason: FolioLedgerReason;
  refType: string | null;
  refId: string | null;
  createdAt: Date;
  createdByUserId: string | null;
};

export type MemoryFolioPack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  folioAmount: number;
  priceMxn: string;
  sortOrder: number;
  active: boolean;
  stripePriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Estado compartido en globalThis: evita dos copias del almacén (p. ej. Server Action vs RSC en dev). */
type JuxaMemoryStores = {
  seeded: boolean;
  defaultOrgId: string;
  nextDigidClient: number;
  nextDigidSignatory: number;
  nextDigidDocument: number;
  organizations: Map<string, MemoryOrganization>;
  usersById: Map<string, MemoryUser>;
  usersByEmail: Map<string, MemoryUser>;
  companies: Map<string, MemoryCompany>;
  signatories: Map<string, MemorySignatory>;
  documents: Map<string, MemoryDocument>;
  documentSignatories: MemoryDocumentSignatory[];
  placements: Map<string, MemorySignaturePlacement>;
  webhookEvents: MemoryWebhookEvent[];
  certificates: Map<string, MemoryCertificate>;
  organizationInvitesById: Map<string, MemoryOrganizationInvite>;
  organizationInvitesByTokenHash: Map<string, MemoryOrganizationInvite>;
  organizationSettingsByOrg: Map<string, MemoryOrganizationSettings>;
  folioLedger: MemoryFolioLedgerEntry[];
  folioPacksById: Map<string, MemoryFolioPack>;
  folioPacksBySlug: Map<string, MemoryFolioPack>;
  apiKeysById: Map<string, MemoryApiKeyRow>;
  apiKeysByHash: Map<string, MemoryApiKeyRow>;
  signingJobsById: Map<string, MemorySigningJobRow>;
  signingJobsByOrgRef: Map<string, MemorySigningJobRow>;
};

const JUXA_MEM_GLOBAL_KEY = "__JUXA_MEMORY_STORE_V1__" as const;

/**
 * IDs estables del seed (org + usuarios). NextAuth persiste `user.id` y `organizationId` en el JWT;
 * si cada reinicio de Node generaba `memCuid()` nuevos, operaciones como el débito de folios fallaban con
 * "Usuario no encontrado en la organización." aunque la sesión pareciera válida.
 */
const MEM_SEED = {
  orgId: "cjuxamemoryorganizationdemo",
  userAdminId: "cjuxamemoryuseradminpanel",
  userOperatorId: "cjuxamemoryuseroperator001",
  userViewerId: "cjuxamemoryuserviewer0001",
  userSandboxId: "cjuxamemoryusersandbox001",
  userSuperadminId: "cjuxamemoryusersuperadmin1",
} as const;

function $m(): JuxaMemoryStores {
  const g = globalThis as typeof globalThis & { [JUXA_MEM_GLOBAL_KEY]?: JuxaMemoryStores };
  if (!g[JUXA_MEM_GLOBAL_KEY]) {
    g[JUXA_MEM_GLOBAL_KEY] = {
      seeded: false,
      defaultOrgId: "",
      nextDigidClient: 91000,
      nextDigidSignatory: 72000,
      nextDigidDocument: 81000,
      organizations: new Map(),
      usersById: new Map(),
      usersByEmail: new Map(),
      companies: new Map(),
      signatories: new Map(),
      documents: new Map(),
      documentSignatories: [],
      placements: new Map(),
      webhookEvents: [],
      certificates: new Map(),
      organizationInvitesById: new Map(),
      organizationInvitesByTokenHash: new Map(),
      organizationSettingsByOrg: new Map(),
      folioLedger: [],
      folioPacksById: new Map(),
      folioPacksBySlug: new Map(),
      apiKeysById: new Map(),
      apiKeysByHash: new Map(),
      signingJobsById: new Map(),
      signingJobsByOrgRef: new Map(),
    };
  }
  const store = g[JUXA_MEM_GLOBAL_KEY]!;
  if (!("apiKeysById" in store)) {
    Object.assign(store, {
      apiKeysById: new Map<string, MemoryApiKeyRow>(),
      apiKeysByHash: new Map<string, MemoryApiKeyRow>(),
      signingJobsById: new Map<string, MemorySigningJobRow>(),
      signingJobsByOrgRef: new Map<string, MemorySigningJobRow>(),
    });
  }
  return store;
}

function touch<T extends { updatedAt: Date }>(row: T): T {
  row.updatedAt = new Date();
  return row;
}

function seed() {
  if ($m().seeded) return;
  $m().seeded = true;

  const orgId = MEM_SEED.orgId;
  $m().defaultOrgId = orgId;
  const now = new Date();
  $m().organizations.set(orgId, {
    id: orgId,
    name: "Organización demo (memoria)",
    slug: "demo-memoria",
    trialEndsAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const panelEmail = getMemoryPanelUserEmail();
  const panelPass = getMemoryPanelUserPasswordPlain();
  const passwordHash = bcrypt.hashSync(panelPass, 10);
  const userId = MEM_SEED.userAdminId;
  const user: MemoryUser = {
    id: userId,
    email: panelEmail,
    passwordHash,
    role: "ADMIN",
    organizationId: orgId,
    folioBalance: 1000,
    createdAt: now,
    updatedAt: now,
  };
  $m().usersById.set(userId, user);
  $m().usersByEmail.set(user.email.toLowerCase(), user);

  const opEmail = getMemoryOperatorUserEmail();
  const opPass = getMemoryOperatorUserPasswordPlain();
  const opHash = bcrypt.hashSync(opPass, 10);
  const opId = MEM_SEED.userOperatorId;
  const operator: MemoryUser = {
    id: opId,
    email: opEmail,
    passwordHash: opHash,
    role: "OPERATOR",
    organizationId: orgId,
    folioBalance: 1000,
    createdAt: now,
    updatedAt: now,
  };
  $m().usersById.set(opId, operator);
  $m().usersByEmail.set(opEmail.toLowerCase(), operator);

  const viewEmail = getMemoryViewerUserEmail();
  const viewPass = getMemoryViewerUserPasswordPlain();
  const viewHash = bcrypt.hashSync(viewPass, 10);
  const viewId = MEM_SEED.userViewerId;
  const viewer: MemoryUser = {
    id: viewId,
    email: viewEmail,
    passwordHash: viewHash,
    role: "VIEWER",
    organizationId: orgId,
    folioBalance: 0,
    createdAt: now,
    updatedAt: now,
  };
  $m().usersById.set(viewId, viewer);
  $m().usersByEmail.set(viewEmail.toLowerCase(), viewer);

  const sbEmail = getMemorySandboxUserEmail();
  const sbPass = getMemorySandboxUserPasswordPlain();
  const sbHash = bcrypt.hashSync(sbPass, 10);
  const sbId = MEM_SEED.userSandboxId;
  const sandboxUser: MemoryUser = {
    id: sbId,
    email: sbEmail,
    passwordHash: sbHash,
    role: "SANDBOX",
    organizationId: orgId,
    folioBalance: 1000,
    createdAt: now,
    updatedAt: now,
  };
  $m().usersById.set(sbId, sandboxUser);
  $m().usersByEmail.set(sbEmail.toLowerCase(), sandboxUser);

  const superEmail = process.env.JUXA_MEMORY_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const superPlain = process.env.JUXA_MEMORY_SUPERADMIN_PASSWORD?.trim();
  if (superEmail && superPlain) {
    const superId = MEM_SEED.userSuperadminId;
    const superUser: MemoryUser = {
      id: superId,
      email: superEmail,
      passwordHash: bcrypt.hashSync(superPlain, 10),
      role: "SUPERADMIN",
      organizationId: orgId,
      folioBalance: 0,
      createdAt: now,
      updatedAt: now,
    };
    $m().usersById.set(superId, superUser);
    $m().usersByEmail.set(superEmail, superUser);
  }

  const c1Id = memCuid();
  const c2Id = memCuid();
  $m().companies.set(c1Id, {
    id: c1Id,
    digidIdClient: $m().nextDigidClient++,
    razonSocial: "Empresa Demo Alpha S.A.",
    rfc: "DEM850101ABC",
    email: "contacto@alpha.demo",
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
  });
  $m().companies.set(c2Id, {
    id: c2Id,
    digidIdClient: $m().nextDigidClient++,
    razonSocial: "Empresa Demo Beta S. de R.L.",
    rfc: "DEB850101XYZ",
    email: "hola@beta.demo",
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
  });

  const s1Id = memCuid();
  $m().signatories.set(s1Id, {
    id: s1Id,
    companyId: c1Id,
    digidSignatoryId: $m().nextDigidSignatory++,
    name: "Ana Firmante",
    email: "ana@alpha.demo",
    phone: null,
    rfc: null,
    isRepLegal: true,
    autoSign: false,
    createdAt: now,
    updatedAt: now,
  });
  const s2Id = memCuid();
  $m().signatories.set(s2Id, {
    id: s2Id,
    companyId: c1Id,
    digidSignatoryId: $m().nextDigidSignatory++,
    name: "Luis Contrato",
    email: "luis@alpha.demo",
    phone: null,
    rfc: null,
    isRepLegal: false,
    autoSign: false,
    createdAt: now,
    updatedAt: now,
  });

  const docId = memCuid();
  const digidDocId = $m().nextDigidDocument++;
  const baseUrl = appBaseUrl();
  $m().documents.set(docId, {
    id: docId,
    companyId: c1Id,
    digidDocumentId: digidDocId,
    nameDoc: "Contrato de prueba (memoria).pdf",
    urlDocumento: `${baseUrl}/firma-prueba`,
    status: "Borrador",
    lastStatusSyncAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const pId = memCuid();
  $m().placements.set(pId, {
    id: pId,
    documentId: docId,
    signatoryId: s1Id,
    page: 1,
    x: 120,
    y: 200,
    widthPx: 180,
    heightPx: 40,
    sortOrder: 0,
    createdAt: now,
  });

  ensureMemoryFolioPacksSeeded(now);
}

function ensureMemoryFolioPacksSeeded(now: Date) {
  if ($m().folioPacksBySlug.size > 0) return;
  const spec: Omit<MemoryFolioPack, "id" | "createdAt" | "updatedAt">[] = [
    {
      slug: "basico",
      name: "Paquete Básico",
      description: "Ideal para pruebas y pocos envíos al mes",
      folioAmount: 50,
      priceMxn: "499.00",
      sortOrder: 10,
      active: true,
      stripePriceId: null,
    },
    {
      slug: "pro",
      name: "Paquete Pro",
      description: "Volumen recurrente de firmas",
      folioAmount: 200,
      priceMxn: "1799.00",
      sortOrder: 20,
      active: true,
      stripePriceId: null,
    },
    {
      slug: "empresa",
      name: "Paquete Empresa",
      description: "Mayor volumen con mejor precio por folio",
      folioAmount: 1000,
      priceMxn: "6999.00",
      sortOrder: 30,
      active: true,
      stripePriceId: null,
    },
  ];
  for (const s of spec) {
    const row: MemoryFolioPack = {
      id: memCuid(),
      ...s,
      createdAt: now,
      updatedAt: now,
    };
    $m().folioPacksById.set(row.id, row);
    $m().folioPacksBySlug.set(row.slug, row);
  }
}

export function getMemoryDefaultOrganizationId(): string {
  seed();
  return $m().defaultOrgId;
}

export function memoryNextDigidClient(): number {
  seed();
  return $m().nextDigidClient++;
}

export function memoryNextDigidSignatory(): number {
  seed();
  return $m().nextDigidSignatory++;
}

export function memoryNextDigidDocument(): number {
  seed();
  return $m().nextDigidDocument++;
}

export function memoryPeekNextDigidDocument(): number {
  seed();
  return $m().nextDigidDocument;
}

// --- User ---

export function memoryFindUserByEmail(email: string) {
  seed();
  const u = $m().usersByEmail.get(email.trim().toLowerCase());
  if (!u) return null;
  const organization = $m().organizations.get(u.organizationId);
  if (!organization) return null;
  return { ...u, organization };
}

// --- Counts ---

export function memoryCounts() {
  seed();
  return {
    companies: $m().companies.size,
    signatories: $m().signatories.size,
    documents: $m().documents.size,
    placements: $m().placements.size,
  };
}

export function memoryHomeDashboardCountsForOrg(organizationId: string) {
  seed();
  const companyIdSet = new Set<string>();
  for (const c of $m().companies.values()) {
    if (c.organizationId === organizationId) companyIdSet.add(c.id);
  }
  let signatoryCount = 0;
  for (const sig of $m().signatories.values()) {
    if (companyIdSet.has(sig.companyId)) signatoryCount += 1;
  }
  let docCount = 0;
  const documentIdSet = new Set<string>();
  for (const d of $m().documents.values()) {
    if (companyIdSet.has(d.companyId)) {
      docCount += 1;
      documentIdSet.add(d.id);
    }
  }
  let placementCount = 0;
  for (const pl of $m().placements.values()) {
    if (documentIdSet.has(pl.documentId)) placementCount += 1;
  }
  return {
    companies: companyIdSet.size,
    signatories: signatoryCount,
    documents: docCount,
    placements: placementCount,
  };
}

export function memoryCompaniesForOrg(
  organizationId: string,
  orderBy: "createdAt" | "razonSocial",
  dir: "asc" | "desc",
) {
  seed();
  const list = [...$m().companies.values()].filter((c) => c.organizationId === organizationId);
  list.sort((a, b) => {
    if (orderBy === "createdAt") {
      const t = a.createdAt.getTime() - b.createdAt.getTime();
      return dir === "asc" ? t : -t;
    }
    const cmp = a.razonSocial.localeCompare(b.razonSocial);
    return dir === "asc" ? cmp : -cmp;
  });
  return list;
}

export function memoryDocumentsWithCompanyForOrg(
  organizationId: string,
  orderField: "createdAt" | "updatedAt",
  dir: "asc" | "desc",
) {
  seed();
  const orgCompanyIds = new Set(
    [...$m().companies.values()].filter((c) => c.organizationId === organizationId).map((c) => c.id),
  );
  const list = [...$m().documents.values()].filter((d) => orgCompanyIds.has(d.companyId));
  list.sort((a, b) => {
    const av = a[orderField].getTime();
    const bv = b[orderField].getTime();
    return dir === "asc" ? av - bv : bv - av;
  });
  return list.map((d) => {
    const company = $m().companies.get(d.companyId);
    if (!company) throw new Error("memory: documento sin empresa");
    return { ...d, company };
  });
}

export function memoryDocumentsForBatchPicker(organizationId: string) {
  seed();
  const orgCompanyIds = new Set(
    [...$m().companies.values()].filter((c) => c.organizationId === organizationId).map((c) => c.id),
  );
  const list = [...$m().documents.values()].filter((d) => orgCompanyIds.has(d.companyId));
  list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return list.map((d) => {
    const company = $m().companies.get(d.companyId);
    if (!company) throw new Error("memory: documento sin empresa");
    const ds = $m().documentSignatories
      .filter((x) => x.documentId === d.id)
      .map((x) => {
        const sig = $m().signatories.get(x.signatoryId);
        return sig ? { signatoryId: x.signatoryId, signatory: sig } : null;
      })
      .filter(Boolean) as {
      signatoryId: string;
      signatory: MemorySignatory;
    }[];
    const pls = [...$m().placements.values()]
      .filter((p) => p.documentId === d.id)
      .map((p) => ({ signatoryId: p.signatoryId }));
    const readiness = evaluateSendReadinessFromEnviarShape({
      placements: pls,
      signatories: ds.map((x) => ({
        signatoryId: x.signatoryId,
        signatory: {
          name: x.signatory.name,
          email: x.signatory.email,
          phone: x.signatory.phone,
        },
      })),
    });
    return {
      id: d.id,
      nameDoc: d.nameDoc,
      companyName: company.razonSocial,
      placementCount: pls.length,
      signatoryLinkCount: ds.length,
      ready: readiness.ready,
      readinessMessage: readiness.ready ? undefined : readiness.message,
    };
  });
}

export function memoryWebhookEventsForOrg(organizationId: string, take: number) {
  seed();
  const digidIds = new Set<number>();
  for (const d of $m().documents.values()) {
    const comp = $m().companies.get(d.companyId);
    if (comp?.organizationId === organizationId) digidIds.add(d.digidDocumentId);
  }
  if (digidIds.size === 0) return [];
  const matched = $m().webhookEvents.filter(
    (e) => e.documentDigidId != null && digidIds.has(e.documentDigidId),
  );
  matched.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  return matched.slice(0, take);
}

// --- Company ---

export function memoryCompaniesFindMany(order: "asc" | "desc" = "asc") {
  seed();
  const list = [...$m().companies.values()].sort((a, b) =>
    order === "asc"
      ? a.razonSocial.localeCompare(b.razonSocial)
      : b.razonSocial.localeCompare(a.razonSocial),
  );
  return list;
}

export function memoryCompaniesFindManyByCreated(dir: "asc" | "desc") {
  seed();
  return [...$m().companies.values()].sort((a, b) => {
    const t = a.createdAt.getTime() - b.createdAt.getTime();
    return dir === "asc" ? t : -t;
  });
}

export function memoryCompanyFindFirstByIdAndOrg(id: string, organizationId: string) {
  seed();
  const c = $m().companies.get(id);
  if (!c || c.organizationId !== organizationId) return null;
  return c;
}

export function memoryCompanyFindFirstByDigidAndOrg(digidIdClient: number, organizationId: string) {
  seed();
  for (const c of $m().companies.values()) {
    if (c.digidIdClient === digidIdClient && c.organizationId === organizationId) return c;
  }
  return null;
}

export function memoryCompanyCreate(data: Omit<MemoryCompany, "id" | "createdAt" | "updatedAt">) {
  seed();
  const now = new Date();
  const row: MemoryCompany = { ...data, id: memCuid(), createdAt: now, updatedAt: now };
  $m().companies.set(row.id, row);
  return row;
}

// --- Document ---

export function memoryDocumentCreate(
  data: Omit<MemoryDocument, "id" | "createdAt" | "updatedAt" | "status" | "lastStatusSyncAt"> & {
    status?: string | null;
    lastStatusSyncAt?: Date | null;
  },
) {
  seed();
  const now = new Date();
  const row: MemoryDocument = {
    ...data,
    status: data.status ?? null,
    lastStatusSyncAt: data.lastStatusSyncAt ?? null,
    id: memCuid(),
    createdAt: now,
    updatedAt: now,
  };
  $m().documents.set(row.id, row);
  return row;
}

export function memoryDocumentFindUnique(id: string, include?: "detail" | "enviar" | "simple") {
  seed();
  const d = $m().documents.get(id);
  if (!d) return null;
  const company = $m().companies.get(d.companyId);
  if (!company) return null;

  if (include === "simple" || include === undefined) {
    return { ...d, company };
  }

  if (include === "detail") {
    const pls = [...$m().placements.values()]
      .filter((p) => p.documentId === id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const certs = [...$m().certificates.values()]
      .filter((c) => c.documentId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const plWithSig = pls.map((p) => {
      const sig = $m().signatories.get(p.signatoryId);
      if (!sig) return null;
      return { ...p, signatory: sig };
    }).filter(Boolean) as (MemorySignaturePlacement & { signatory: MemorySignatory })[];
    return {
      ...d,
      company,
      placements: plWithSig,
      certificates: certs,
    };
  }

  if (include === "enviar") {
    const ds = $m().documentSignatories
      .filter((x) => x.documentId === id)
      .map((x) => {
        const sig = $m().signatories.get(x.signatoryId);
        return sig ? { ...x, signatory: sig } : null;
      })
      .filter(Boolean) as (MemoryDocumentSignatory & { signatory: MemorySignatory })[];
    const pls = [...$m().placements.values()].filter((p) => p.documentId === id);
    return {
      ...d,
      company,
      signatories: ds,
      placements: pls,
    };
  }

  return { ...d, company };
}

export function memoryDocumentFindManyWithCompany(orderField: "createdAt" | "updatedAt", dir: "asc" | "desc") {
  seed();
  const list = [...$m().documents.values()].sort((a, b) => {
    const av = a[orderField].getTime();
    const bv = b[orderField].getTime();
    return dir === "asc" ? av - bv : bv - av;
  });
  return list.map((d) => {
    const company = $m().companies.get(d.companyId)!;
    return { ...d, company };
  });
}

export function memoryDocumentFindFirstInOrg(
  documentId: string,
  organizationId: string,
  extra?: "company" | "placements" | "signatories",
) {
  seed();
  const d = $m().documents.get(documentId);
  if (!d) return null;
  const company = $m().companies.get(d.companyId);
  if (!company || company.organizationId !== organizationId) return null;

  if (extra === "company") {
    return { ...d, company };
  }
  if (extra === "placements") {
    const pls = [...$m().placements.values()]
      .filter((p) => p.documentId === documentId)
      .sort((a, b) =>
        a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.createdAt.getTime() - b.createdAt.getTime(),
      )
      .map((p) => {
        const sig = $m().signatories.get(p.signatoryId);
        return sig ? { ...p, signatory: sig } : null;
      })
      .filter(Boolean) as (MemorySignaturePlacement & { signatory: MemorySignatory })[];
    return { ...d, company, placements: pls };
  }
  if (extra === "signatories") {
    const ds = $m().documentSignatories
      .filter((x) => x.documentId === documentId)
      .map((x) => {
        const sig = $m().signatories.get(x.signatoryId);
        return sig ? { ...x, signatory: sig } : null;
      })
      .filter(Boolean) as (MemoryDocumentSignatory & { signatory: MemorySignatory })[];
    return { ...d, company, signatories: ds };
  }

  return { ...d, company };
}

export function memoryDocumentUpdate(
  id: string,
  data: Partial<Pick<MemoryDocument, "status" | "urlDocumento" | "lastStatusSyncAt">>,
) {
  seed();
  const d = $m().documents.get(id);
  if (!d) return null;
  if (data.status !== undefined) d.status = data.status;
  if (data.urlDocumento !== undefined) d.urlDocumento = data.urlDocumento;
  if (data.lastStatusSyncAt !== undefined) d.lastStatusSyncAt = data.lastStatusSyncAt;
  touch(d);
  return d;
}

export function memoryDocumentUpdateManyByDigidId(digidDocumentId: number, status: string) {
  seed();
  let n = 0;
  for (const d of $m().documents.values()) {
    if (d.digidDocumentId === digidDocumentId) {
      d.status = status;
      touch(d);
      n++;
    }
  }
  return n;
}

export function memoryFindDocumentInOrg(documentId: string, organizationId: string) {
  const base = memoryDocumentFindFirstInOrg(documentId, organizationId);
  if (!base) return null;
  const d = $m().documents.get(documentId)!;
  const company = $m().companies.get(d.companyId)!;
  const ds = $m().documentSignatories
    .filter((x) => x.documentId === documentId)
    .map((x) => {
      const sig = $m().signatories.get(x.signatoryId);
      return sig ? { ...x, signatory: sig } : null;
    })
    .filter(Boolean) as (MemoryDocumentSignatory & { signatory: MemorySignatory })[];
  const pls = [...$m().placements.values()]
    .filter((p) => p.documentId === documentId)
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const certs = [...$m().certificates.values()]
    .filter((c) => c.documentId === documentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    ...d,
    company,
    signatories: ds,
    placements: pls,
    certificates: certs,
  };
}

export function memoryFindDocumentDetailInOrg(documentId: string, organizationId: string) {
  const base = memoryDocumentFindFirstInOrg(documentId, organizationId);
  if (!base) return null;
  const d = $m().documents.get(documentId)!;
  const company = $m().companies.get(d.companyId)!;
  const ds = $m().documentSignatories
    .filter((x) => x.documentId === documentId)
    .map((x) => {
      const sig = $m().signatories.get(x.signatoryId);
      return sig ? { ...x, signatory: sig } : null;
    })
    .filter(Boolean) as (MemoryDocumentSignatory & { signatory: MemorySignatory })[];
  const pls = [...$m().placements.values()]
    .filter((p) => p.documentId === documentId)
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .map((p) => {
      const sig = $m().signatories.get(p.signatoryId);
      return sig ? { ...p, signatory: sig } : null;
    })
    .filter(Boolean) as (MemorySignaturePlacement & { signatory: MemorySignatory })[];
  const certs = [...$m().certificates.values()]
    .filter((c) => c.documentId === documentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    ...d,
    company,
    signatories: ds,
    placements: pls,
    certificates: certs,
  };
}

// --- Signatory ---

export function memorySignatoryFindManyByCompany(companyId: string) {
  seed();
  return [...$m().signatories.values()]
    .filter((s) => s.companyId === companyId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function memorySignatoryFindManyByIds(ids: string[], companyId: string) {
  seed();
  return ids.map((id) => $m().signatories.get(id)).filter((s): s is MemorySignatory => !!s && s.companyId === companyId);
}

export function memorySignatoryFindFirstInOrg(id: string, organizationId: string) {
  seed();
  const s = $m().signatories.get(id);
  if (!s) return null;
  const c = $m().companies.get(s.companyId);
  if (!c || c.organizationId !== organizationId) return null;
  return s;
}

export function memorySignatoryUpsert(
  companyId: string,
  digidSignatoryId: number,
  data: Omit<MemorySignatory, "id" | "companyId" | "digidSignatoryId" | "createdAt" | "updatedAt">,
) {
  seed();
  const now = new Date();
  let existing: MemorySignatory | undefined;
  for (const s of $m().signatories.values()) {
    if (s.companyId === companyId && s.digidSignatoryId === digidSignatoryId) {
      existing = s;
      break;
    }
  }
  if (existing) {
    Object.assign(existing, data);
    touch(existing);
    return existing;
  }
  const row: MemorySignatory = {
    id: memCuid(),
    companyId,
    digidSignatoryId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  $m().signatories.set(row.id, row);
  return row;
}

export function memorySignatoryDelete(id: string) {
  seed();
  if (!$m().signatories.has(id)) return;
  for (let i = $m().documentSignatories.length - 1; i >= 0; i--) {
    if ($m().documentSignatories[i]!.signatoryId === id) $m().documentSignatories.splice(i, 1);
  }
  for (const pid of [...$m().placements.keys()]) {
    const p = $m().placements.get(pid)!;
    if (p.signatoryId === id) $m().placements.delete(pid);
  }
  $m().signatories.delete(id);
}

// --- Document signatory ---

export function memoryDocumentSignatoryReplace(documentId: string, rows: { signatoryId: string; kyc: boolean }[]) {
  seed();
  for (let i = $m().documentSignatories.length - 1; i >= 0; i--) {
    if ($m().documentSignatories[i]!.documentId === documentId) $m().documentSignatories.splice(i, 1);
  }
  for (const r of rows) {
    $m().documentSignatories.push({
      id: memCuid(),
      documentId,
      signatoryId: r.signatoryId,
      kyc: r.kyc,
    });
  }
}

// --- Placements ---

export function memoryPlacementCreate(
  data: Omit<MemorySignaturePlacement, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number },
) {
  seed();
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    let max = -1;
    for (const p of $m().placements.values()) {
      if (p.documentId === data.documentId && p.sortOrder > max) max = p.sortOrder;
    }
    sortOrder = max + 1;
  }
  const row: MemorySignaturePlacement = {
    ...data,
    sortOrder,
    id: memCuid(),
    createdAt: new Date(),
  };
  $m().placements.set(row.id, row);
  return row;
}

export function memoryPlacementDeleteManyForDocument(documentId: string) {
  seed();
  for (const pid of [...$m().placements.keys()]) {
    if ($m().placements.get(pid)!.documentId === documentId) $m().placements.delete(pid);
  }
}

export function memoryPlacementsReorder(
  documentId: string,
  organizationId: string,
  orderedIds: string[],
): { ok: true } | { ok: false; message: string } {
  seed();
  const d = $m().documents.get(documentId);
  if (!d) return { ok: false, message: "Documento no encontrado." };
  const company = $m().companies.get(d.companyId);
  if (!company || company.organizationId !== organizationId) {
    return { ok: false, message: "Documento no encontrado." };
  }
  const docIds = [...$m().placements.values()]
    .filter((p) => p.documentId === documentId)
    .map((p) => p.id);
  const idSet = new Set(docIds);
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return { ok: false, message: "La lista debe incluir todas las marcas del documento, sin duplicados." };
  }
  orderedIds.forEach((id, index) => {
    const row = $m().placements.get(id);
    if (row) row.sortOrder = index;
  });
  return { ok: true };
}

// --- Certificate ---

export function memoryCertificateCreate(data: Omit<MemoryCertificate, "id" | "createdAt">) {
  seed();
  const row: MemoryCertificate = {
    ...data,
    id: memCuid(),
    createdAt: new Date(),
  };
  $m().certificates.set(row.id, row);
  return row;
}

export function memoryCertificateFindFirst(id: string, organizationId: string) {
  seed();
  const cert = $m().certificates.get(id);
  if (!cert) return null;
  const doc = $m().documents.get(cert.documentId);
  if (!doc) return null;
  const comp = $m().companies.get(doc.companyId);
  if (!comp || comp.organizationId !== organizationId) return null;
  return cert;
}

// --- Webhook ---

const MAX_WEBHOOKS = 100;

export function memoryWebhookFindPriorDuplicate(hash: string, since: Date) {
  seed();
  return (
    $m().webhookEvents.find((e) => e.payloadHash === hash && e.receivedAt >= since) ?? null
  );
}

export function memoryWebhookCreate(data: Omit<MemoryWebhookEvent, "id">) {
  seed();
  const row: MemoryWebhookEvent = { ...data, id: memCuid() };
  $m().webhookEvents.unshift(row);
  while ($m().webhookEvents.length > MAX_WEBHOOKS) $m().webhookEvents.pop();
  return row;
}

export function memoryWebhookUpdate(
  id: string,
  data: Partial<
    Pick<
      MemoryWebhookEvent,
      "processed" | "documentDigidId" | "parsedStatus" | "parseError"
    >
  >,
) {
  seed();
  const e = $m().webhookEvents.find((x) => x.id === id);
  if (!e) return null;
  Object.assign(e, data);
  return e;
}

export function memoryWebhookFindManyRecent(take: number) {
  seed();
  return $m().webhookEvents.slice(0, take);
}

export function memoryDocumentFindFirstByDigidId(digidDocumentId: number) {
  seed();
  for (const d of $m().documents.values()) {
    if (d.digidDocumentId === digidDocumentId) return { status: d.status };
  }
  return null;
}

export function memoryDocumentNotifyContextByDigidId(digidDocumentId: number) {
  seed();
  for (const d of $m().documents.values()) {
    if (d.digidDocumentId !== digidDocumentId) continue;
    const company = $m().companies.get(d.companyId);
    return {
      id: d.id,
      nameDoc: d.nameDoc,
      organizationId: company?.organizationId ?? null,
    };
  }
  return null;
}

export function memoryOrgAdminEmailsForNotify(organizationId: string) {
  seed();
  return [...$m().usersById.values()]
    .filter((u) => u.organizationId === organizationId && (u.role === "ADMIN" || u.role === "SUPERADMIN"))
    .map((u) => u.email);
}

// --- Organization team / invites ---

function memoryInviteIndexRemove(inv: MemoryOrganizationInvite) {
  $m().organizationInvitesByTokenHash.delete(inv.tokenHash);
}

export function memoryOrgUsersList(organizationId: string) {
  seed();
  return [...$m().usersById.values()]
    .filter((u) => u.organizationId === organizationId)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function memoryOrgUserCount(organizationId: string) {
  seed();
  return [...$m().usersById.values()].filter((u) => u.organizationId === organizationId).length;
}

export function memoryOrgInvitesList(organizationId: string) {
  seed();
  return [...$m().organizationInvitesById.values()]
    .filter((i) => i.organizationId === organizationId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function memoryOrgInviteFindByTokenHash(tokenHash: string) {
  seed();
  const inv = $m().organizationInvitesByTokenHash.get(tokenHash);
  if (!inv) return null;
  const org = $m().organizations.get(inv.organizationId);
  if (!org) return null;
  return { invite: inv, organizationName: org.name };
}

export function memoryOrgInviteUpsert(data: {
  organizationId: string;
  email: string;
  role: UserRole;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId: string | null;
}): MemoryOrganizationInvite {
  seed();
  const emailLower = data.email.trim().toLowerCase();
  let existing: MemoryOrganizationInvite | undefined;
  for (const inv of $m().organizationInvitesById.values()) {
    if (inv.organizationId === data.organizationId && inv.email === emailLower) {
      existing = inv;
      break;
    }
  }
  const now = new Date();
  if (existing) {
    memoryInviteIndexRemove(existing);
    existing.tokenHash = data.tokenHash;
    existing.expiresAt = data.expiresAt;
    existing.role = data.role;
    existing.invitedByUserId = data.invitedByUserId;
    $m().organizationInvitesByTokenHash.set(data.tokenHash, existing);
    return existing;
  }
  const row: MemoryOrganizationInvite = {
    id: memCuid(),
    organizationId: data.organizationId,
    email: emailLower,
    role: data.role,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    invitedByUserId: data.invitedByUserId,
    createdAt: now,
  };
  $m().organizationInvitesById.set(row.id, row);
  $m().organizationInvitesByTokenHash.set(row.tokenHash, row);
  return row;
}

export function memoryOrgInviteDelete(id: string, organizationId: string): boolean {
  seed();
  const inv = $m().organizationInvitesById.get(id);
  if (!inv || inv.organizationId !== organizationId) return false;
  $m().organizationInvitesByTokenHash.delete(inv.tokenHash);
  $m().organizationInvitesById.delete(id);
  return true;
}

export function memoryOrgInviteDeleteByTokenHash(tokenHash: string): boolean {
  seed();
  const inv = $m().organizationInvitesByTokenHash.get(tokenHash);
  if (!inv) return false;
  $m().organizationInvitesByTokenHash.delete(inv.tokenHash);
  $m().organizationInvitesById.delete(inv.id);
  return true;
}

export function memoryOrgSettingsGet(organizationId: string): MemoryOrganizationSettings | null {
  seed();
  return $m().organizationSettingsByOrg.get(organizationId) ?? null;
}

export function memoryOrgSettingsUpsert(data: {
  organizationId: string;
  displayName?: string | null;
  maxUsers?: number | null;
  maxMonthlySends?: number | null;
  folioPremiumEnabled?: boolean;
}): MemoryOrganizationSettings {
  seed();
  const now = new Date();
  const cur = $m().organizationSettingsByOrg.get(data.organizationId);
  const row: MemoryOrganizationSettings = {
    organizationId: data.organizationId,
    displayName: data.displayName !== undefined ? data.displayName : (cur?.displayName ?? null),
    maxUsers: data.maxUsers !== undefined ? data.maxUsers : (cur?.maxUsers ?? null),
    maxMonthlySends: data.maxMonthlySends !== undefined ? data.maxMonthlySends : (cur?.maxMonthlySends ?? null),
    folioPremiumEnabled:
      data.folioPremiumEnabled !== undefined ? data.folioPremiumEnabled : (cur?.folioPremiumEnabled ?? false),
    updatedAt: now,
  };
  $m().organizationSettingsByOrg.set(data.organizationId, row);
  return row;
}

export function memorySuperAdminDashboardCounts() {
  seed();
  let companyCount = 0;
  for (const c of $m().companies.values()) {
    if (c.organizationId) companyCount += 1;
  }
  return {
    organizations: $m().organizations.size,
    users: $m().usersById.size,
    companies: companyCount,
    documents: $m().documents.size,
  };
}

export function memorySuperAdminOrganizationsList() {
  seed();
  return [...$m().organizations.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      trialEndsAt: org.trialEndsAt,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      _count: {
        users: memoryOrgUserCount(org.id),
        companies: [...$m().companies.values()].filter((c) => c.organizationId === org.id).length,
      },
    }));
}

export function memorySuperAdminOrganizationById(id: string) {
  seed();
  const org = $m().organizations.get(id);
  if (!org) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    trialEndsAt: org.trialEndsAt,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    settings: memoryOrgSettingsGet(id),
    _count: {
      users: memoryOrgUserCount(id),
      companies: [...$m().companies.values()].filter((c) => c.organizationId === id).length,
    },
  };
}

export function memoryUserCreate(data: {
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId: string;
  folioBalance?: number;
}): MemoryUser {
  seed();
  const now = new Date();
  const row: MemoryUser = {
    id: memCuid(),
    email: data.email.trim().toLowerCase(),
    passwordHash: data.passwordHash,
    role: data.role,
    organizationId: data.organizationId,
    folioBalance: data.folioBalance ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  $m().usersById.set(row.id, row);
  $m().usersByEmail.set(row.email, row);
  return row;
}

export function memoryUserFindByEmailGlobal(email: string): MemoryUser | null {
  seed();
  return $m().usersByEmail.get(email.trim().toLowerCase()) ?? null;
}

export function memoryOrganizationFindById(id: string) {
  seed();
  return $m().organizations.get(id) ?? null;
}

export function memoryOrganizationFindBySlug(slug: string) {
  seed();
  const n = slug.trim().toLowerCase();
  for (const o of $m().organizations.values()) {
    if (o.slug === n) return o;
  }
  return null;
}

const SELF_SERVICE_WELCOME_FOLIOS = 1;

/** Alta self-service: org + settings + admin + folio de bienvenida (memoria). */
export function memoryRegisterOrganizationWithAdmin(data: {
  name: string;
  slug: string;
  email: string;
  passwordHash: string;
}): { organizationId: string; userId: string } {
  seed();
  const now = new Date();
  const orgId = memCuid();
  $m().organizations.set(orgId, {
    id: orgId,
    name: data.name.trim(),
    slug: data.slug.trim().toLowerCase(),
    trialEndsAt: null,
    createdAt: now,
    updatedAt: now,
  });
  memoryOrgSettingsUpsert({
    organizationId: orgId,
    displayName: null,
    maxUsers: null,
    maxMonthlySends: null,
    folioPremiumEnabled: false,
  });
  const user = memoryUserCreate({
    email: data.email,
    passwordHash: data.passwordHash,
    role: "ADMIN",
    organizationId: orgId,
  });
  const g = memoryFolioGrant({
    userId: user.id,
    organizationId: orgId,
    delta: SELF_SERVICE_WELCOME_FOLIOS,
    reason: "TRIAL_GRANT",
    createdByUserId: null,
  });
  if (!g.ok) {
    throw new Error(g.message);
  }
  return { organizationId: orgId, userId: user.id };
}

export type MemoryApiKeyRow = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export type MemorySigningJobRow = {
  id: string;
  organizationId: string;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
  clientReference: string | null;
  payload: unknown;
  result: unknown | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function jobRefKey(organizationId: string, clientReference: string) {
  return `${organizationId}\0${clientReference}`;
}

export function memoryApiKeyCreate(data: {
  organizationId: string;
  ownerUserId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
}): MemoryApiKeyRow {
  seed();
  const row: MemoryApiKeyRow = {
    id: memCuid(),
    organizationId: data.organizationId,
    ownerUserId: data.ownerUserId,
    name: data.name,
    keyPrefix: data.keyPrefix,
    keyHash: data.keyHash,
    createdAt: new Date(),
    lastUsedAt: null,
  };
  $m().apiKeysById.set(row.id, row);
  $m().apiKeysByHash.set(row.keyHash, row);
  return row;
}

export function memoryApiKeysList(organizationId: string) {
  seed();
  return [...$m().apiKeysById.values()]
    .filter((k) => k.organizationId === organizationId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function memoryApiKeyDelete(id: string, organizationId: string): boolean {
  seed();
  const k = $m().apiKeysById.get(id);
  if (!k || k.organizationId !== organizationId) return false;
  $m().apiKeysByHash.delete(k.keyHash);
  $m().apiKeysById.delete(id);
  return true;
}

export function memoryApiKeyFindByHash(keyHash: string): MemoryApiKeyRow | null {
  seed();
  return $m().apiKeysByHash.get(keyHash) ?? null;
}

export function memoryApiKeyTouchUsed(keyHash: string) {
  seed();
  const k = $m().apiKeysByHash.get(keyHash);
  if (k) k.lastUsedAt = new Date();
}

export function memorySigningJobFindByOrgRef(organizationId: string, clientReference: string) {
  seed();
  return $m().signingJobsByOrgRef.get(jobRefKey(organizationId, clientReference)) ?? null;
}

export function memorySigningJobCreate(data: {
  organizationId: string;
  clientReference: string | null;
  payload: unknown;
}): MemorySigningJobRow {
  seed();
  const now = new Date();
  const row: MemorySigningJobRow = {
    id: memCuid(),
    organizationId: data.organizationId,
    status: "PENDING",
    clientReference: data.clientReference,
    payload: data.payload,
    result: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
  $m().signingJobsById.set(row.id, row);
  if (data.clientReference) {
    $m().signingJobsByOrgRef.set(jobRefKey(data.organizationId, data.clientReference), row);
  }
  return row;
}

export function memorySigningJobUpdate(
  id: string,
  data: Partial<Pick<MemorySigningJobRow, "status" | "result" | "errorMessage">>,
) {
  seed();
  const j = $m().signingJobsById.get(id);
  if (!j) return null;
  if (data.status !== undefined) j.status = data.status;
  if (data.result !== undefined) j.result = data.result;
  if (data.errorMessage !== undefined) j.errorMessage = data.errorMessage;
  j.updatedAt = new Date();
  return j;
}

export function memorySigningJobsList(organizationId: string, take: number) {
  seed();
  return [...$m().signingJobsById.values()]
    .filter((j) => j.organizationId === organizationId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, take);
}

// --- Folios (cartera por usuario, ledger, catálogo) ---

export function memoryUserFindById(id: string): MemoryUser | null {
  seed();
  return $m().usersById.get(id) ?? null;
}

export function memoryFolioPacksListActive() {
  seed();
  return [...$m().folioPacksById.values()]
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function memoryFolioPacksListAll() {
  seed();
  return [...$m().folioPacksById.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function memoryFolioPackFindById(id: string) {
  seed();
  return $m().folioPacksById.get(id) ?? null;
}

export function memoryFolioPackCreate(data: {
  slug: string;
  name: string;
  description: string | null;
  folioAmount: number;
  priceMxn: string;
  sortOrder: number;
  active: boolean;
}): MemoryFolioPack {
  seed();
  const now = new Date();
  const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if ($m().folioPacksBySlug.has(slug)) {
    throw new Error("slug_duplicado");
  }
  const row: MemoryFolioPack = {
    id: memCuid(),
    slug,
    name: data.name.trim(),
    description: data.description,
    folioAmount: data.folioAmount,
    priceMxn: data.priceMxn,
    sortOrder: data.sortOrder,
    active: data.active,
    stripePriceId: null,
    createdAt: now,
    updatedAt: now,
  };
  $m().folioPacksById.set(row.id, row);
  $m().folioPacksBySlug.set(row.slug, row);
  return row;
}

export function memoryFolioPackUpdate(
  id: string,
  data: Partial<Pick<MemoryFolioPack, "name" | "description" | "folioAmount" | "priceMxn" | "sortOrder" | "active">>,
): MemoryFolioPack | null {
  seed();
  const row = $m().folioPacksById.get(id);
  if (!row) return null;
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.description !== undefined) row.description = data.description;
  if (data.folioAmount !== undefined) row.folioAmount = data.folioAmount;
  if (data.priceMxn !== undefined) row.priceMxn = data.priceMxn;
  if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;
  if (data.active !== undefined) row.active = data.active;
  row.updatedAt = new Date();
  return row;
}

export function memoryFolioPackDelete(id: string): boolean {
  seed();
  const row = $m().folioPacksById.get(id);
  if (!row) return false;
  $m().folioPacksBySlug.delete(row.slug);
  $m().folioPacksById.delete(id);
  return true;
}

export function memoryFolioTryDebit(params: {
  userId: string;
  organizationId: string;
  cost: number;
  reason: FolioLedgerReason;
  refType?: string | null;
  refId?: string | null;
  createdByUserId: string | null;
}): { ok: true; balanceAfter: number } | { ok: false; message: string } {
  seed();
  const u = $m().usersById.get(params.userId);
  if (!u || u.organizationId !== params.organizationId) {
    return {
      ok: false,
      message:
        "Tu sesión no coincide con los datos en memoria (p. ej. tras reiniciar el servidor). Cierra sesión y vuelve a entrar.",
    };
  }
  if (u.folioBalance < params.cost) {
    return {
      ok: false,
      message: `Saldo insuficiente: tienes ${u.folioBalance} crédito(s) y se requieren ${params.cost}.`,
    };
  }
  u.folioBalance -= params.cost;
  touch(u);
  const entry: MemoryFolioLedgerEntry = {
    id: memCuid(),
    userId: params.userId,
    organizationId: params.organizationId,
    delta: -params.cost,
    balanceAfter: u.folioBalance,
    reason: params.reason,
    refType: params.refType ?? null,
    refId: params.refId ?? null,
    createdAt: new Date(),
    createdByUserId: params.createdByUserId,
  };
  $m().folioLedger.push(entry);
  return { ok: true, balanceAfter: u.folioBalance };
}

export function memoryFolioGrant(params: {
  userId: string;
  organizationId: string;
  delta: number;
  reason: FolioLedgerReason;
  createdByUserId: string | null;
}): { ok: true; balanceAfter: number } | { ok: false; message: string } {
  seed();
  if (params.delta <= 0) {
    return { ok: false, message: "El monto debe ser positivo." };
  }
  const u = $m().usersById.get(params.userId);
  if (!u || u.organizationId !== params.organizationId) {
    return {
      ok: false,
      message:
        "Tu sesión no coincide con los datos en memoria (p. ej. tras reiniciar el servidor). Cierra sesión y vuelve a entrar.",
    };
  }
  u.folioBalance += params.delta;
  touch(u);
  $m().folioLedger.push({
    id: memCuid(),
    userId: params.userId,
    organizationId: params.organizationId,
    delta: params.delta,
    balanceAfter: u.folioBalance,
    reason: params.reason,
    refType: null,
    refId: null,
    createdAt: new Date(),
    createdByUserId: params.createdByUserId,
  });
  return { ok: true, balanceAfter: u.folioBalance };
}

export function memoryFolioLedgerForUser(userId: string, take: number) {
  seed();
  return $m().folioLedger
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, take);
}

export function memoryFolioLedgerSuperadmin(filters: { userId?: string; organizationId?: string }, take: number) {
  seed();
  let rows = [...$m().folioLedger];
  if (filters.userId) rows = rows.filter((e) => e.userId === filters.userId);
  if (filters.organizationId) rows = rows.filter((e) => e.organizationId === filters.organizationId);
  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, take)
    .map((e) => ({
      ...e,
      user: { email: $m().usersById.get(e.userId)?.email ?? "?" },
    }));
}

export function memorySuperAdminUsersSearch(q: string, take: number) {
  seed();
  const term = q.trim().toLowerCase();
  let rows = [...$m().usersById.values()];
  if (term) {
    rows = rows.filter((u) => u.email.includes(term) || u.id === q.trim());
  }
  rows.sort((a, b) => a.email.localeCompare(b.email));
  return rows.slice(0, take).map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    organizationId: u.organizationId,
    folioBalance: u.folioBalance,
  }));
}

export function memorySuperAdminOrganizationsListForAdminTable() {
  seed();
  return [...$m().organizations.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((org) => {
      const users = [...$m().usersById.values()].filter((u) => u.organizationId === org.id);
      const companyCount = [...$m().companies.values()].filter((c) => c.organizationId === org.id).length;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        trialEndsAt: org.trialEndsAt,
        userCount: users.length,
        companyCount,
        totalFolioBalance: users.reduce((s, u) => s + u.folioBalance, 0),
      };
    });
}

export function memorySuperAdminFolioAggregatesSince(since: Date) {
  seed();
  const map = new Map<string, { entryCount: number; sumDelta: number }>();
  for (const e of $m().folioLedger) {
    if (e.createdAt.getTime() < since.getTime()) continue;
    const cur = map.get(e.reason) ?? { entryCount: 0, sumDelta: 0 };
    cur.entryCount += 1;
    cur.sumDelta += e.delta;
    map.set(e.reason, cur);
  }
  return [...map.entries()].map(([reason, v]) => ({
    reason,
    entryCount: v.entryCount,
    sumDelta: v.sumDelta,
  }));
}

export function memorySuperAdminUsageOverview(since30: Date, since7: Date) {
  seed();
  const organizationCount = $m().organizations.size;
  let organizationsCreatedLast30Days = 0;
  for (const o of $m().organizations.values()) {
    if (o.createdAt.getTime() >= since30.getTime()) organizationsCreatedLast30Days += 1;
  }
  const orgsWithSend = new Set<string>();
  let folioLedgerLinesLast7Days = 0;
  let sendDeltaSum = 0;
  for (const e of $m().folioLedger) {
    if (e.createdAt.getTime() >= since7.getTime()) folioLedgerLinesLast7Days += 1;
    if (e.createdAt.getTime() >= since30.getTime() && (e.reason === "SEND_STANDARD" || e.reason === "SEND_PREMIUM")) {
      orgsWithSend.add(e.organizationId);
      sendDeltaSum += e.delta;
    }
  }
  return {
    organizationCount,
    organizationsCreatedLast30Days,
    distinctOrgsWithSendsLast30Days: orgsWithSend.size,
    folioLedgerLinesLast7Days,
    estimatedFoliosConsumedLast30Days: sendDeltaSum >= 0 ? 0 : Math.abs(sendDeltaSum),
  };
}
