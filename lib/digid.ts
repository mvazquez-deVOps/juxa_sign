/**
 * Cliente DIGID — solo servidor. Ver docs/api-digid.md
 */
import { isDigidMocked } from "@/lib/data/mode";
import * as digidMock from "@/lib/digid-mock";

const REQUIRED = [
  "DIGID_API_BASE",
  "DIGID_LEGACY_BASE",
  "DIGID_USUARIO",
  "DIGID_CLAVE",
  "DIGID_TOKEN",
  "DIGID_MODO",
] as const;

export function assertDigidEnv(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(`Faltan variables de entorno del proveedor de firma: ${missing.join(", ")}`);
  }
}

function trimBase(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Algunos sandboxes DIGID aceptan solo 0/1; otros esperan boolean JSON.
 * `DIGID_FLAG_SERIALIZATION=boolean` fuerza true/false en send_doc (FolioPremium)
 * y add_assigned_doc (kyc por firmante). Por defecto: numeric.
 */
function digidFlagsAsBoolean(): boolean {
  const v = process.env.DIGID_FLAG_SERIALIZATION?.trim().toLowerCase();
  return v === "boolean" || v === "true";
}

function serializeDigidFlag(value: boolean): number | boolean {
  return digidFlagsAsBoolean() ? value : value ? 1 : 0;
}

/** Interpreta respuestas Bearer con `Success`/`success` mezclados (sandbox / versiones). */
export function parseDigidBearerResult(data: Record<string, unknown>): {
  ok: boolean;
  message?: string;
} {
  const ok =
    data.Success === true ||
    data.success === true ||
    data.Success === 1 ||
    data.success === 1;
  const msgCandidates = [data.Message, data.message, data.Error, data.error];
  const message = msgCandidates.find((m): m is string => typeof m === "string" && m.length > 0);
  return { ok, message };
}

async function readJsonOrThrow(res: Response, label: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${label}: HTTP ${res.status} — cuerpo no es JSON (${text.slice(0, 400)}${text.length > 400 ? "…" : ""})`,
    );
  }
  if (!res.ok) {
    const { message } = parseDigidBearerResult(data);
    throw new Error(
      message ?? `${label}: HTTP ${res.status} — ${text.slice(0, 500)}${text.length > 500 ? "…" : ""}`,
    );
  }
  return data;
}

export async function digidFetchBearer(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  assertDigidEnv();
  const base = trimBase(process.env.DIGID_API_BASE!);
  const url = path.startsWith("http") ? path : `${base}/${path.replace(/^\//, "")}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${process.env.DIGID_TOKEN}`);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

/**
 * URLs candidatas para POST legacy (se prueban en orden hasta HTTP 200 o agotar lista en 404).
 * 1) Doc: `.../index.php/Acción`
 * 2) Sin `index.php` en path: `.../public/Acción`
 * 3) Query (algunos PHP): `.../index.php?action=Acción`
 */
function legacyActionUrls(baseRaw: string, action: string): string[] {
  const base = trimBase(baseRaw);
  const a = action.replace(/^\//, "");
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };

  push(`${base}/${a}`);

  if (!process.env.DIGID_LEGACY_SKIP_INDEXPHP_RETRY?.trim()) {
    const withoutIndexPhp = base.replace(/\/index\.php$/i, "");
    if (withoutIndexPhp !== base) {
      push(`${withoutIndexPhp}/${a}`);
    }
  }

  if (!process.env.DIGID_LEGACY_SKIP_QUERY_RETRY?.trim() && /\.php$/i.test(base)) {
    const sep = base.includes("?") ? "&" : "?";
    push(`${base}${sep}action=${encodeURIComponent(a)}`);
  }

  return urls;
}

function legacyHttpErrorMessage(action: string, status: number, text: string): string {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const m = j.message ?? j.Message ?? j.error;
    if (typeof m === "string" && m.trim()) return `DIGID ${action} (HTTP ${status}): ${m.trim()}`;
    const desc = j.ExtraInfo && typeof j.ExtraInfo === "object" && (j.ExtraInfo as { Descripcion?: string }).Descripcion;
    if (typeof desc === "string" && desc.trim()) return `DIGID ${action} (HTTP ${status}): ${desc.trim()}`;
  } catch {
    /* cuerpo no JSON */
  }
  const clip = text.replace(/\s+/g, " ").trim().slice(0, 280);
  return `DIGID ${action} (HTTP ${status})${clip ? `: ${clip}` : ""}`;
}

export async function digidPostLegacy(
  action: string,
  body: Record<string, unknown>,
): Promise<any> {
  assertDigidEnv();
  const baseRaw = process.env.DIGID_LEGACY_BASE!.trim();
  const urls = legacyActionUrls(baseRaw, action);

  const payload = {
    Usuario: process.env.DIGID_USUARIO!.trim(),
    Clave: process.env.DIGID_CLAVE!.trim(),
    Token: process.env.DIGID_TOKEN!.trim(),
    Modo: process.env.DIGID_MODO!.trim(),
    ...body,
  };

  const safePayload = { ...payload, Clave: "***", Token: "***" };

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    console.log(`\n🚀 [DIGID LEGACY] POST ${url}`);
    console.log(`📦 PAYLOAD:`, JSON.stringify(safePayload));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "JuxaSign-Backend/1.0",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`📥 STATUS: ${res.status} · body: ${text.slice(0, 400)}${text.length > 400 ? "…" : ""}`);
    console.log(`----------------------------------------`);

    if (res.ok) {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error(
          `DIGID ${action}: HTTP 200 pero la respuesta no es JSON válido (${text.slice(0, 200)}…).`,
        );
      }
    }

    if (res.status === 404 && i < urls.length - 1) {
      console.warn(`[DIGID legacy] 404 en esta ruta; reintentando URL alternativa…`);
      continue;
    }

    throw new Error(legacyHttpErrorMessage(action, res.status, text));
  }

  throw new Error(`DIGID ${action}: no se pudo completar la petición legacy.`);
}

// --- Tipos respuestas ---

export type LegacyRegistrarResponse = {
  Codigo: number;
  ExtraInfo?: { Id?: string; Descripcion?: string };
};

export type BearerSuccessData<T> = {
  Success: boolean;
  Message?: string;
  Data?: T;
};

export type SaveSignatoryData = {
  id: number;
  name?: string;
  RL?: number;
  newSignatory?: boolean;
};

export type CreateDocData = {
  IdDocumento: number;
  UrlDocumento?: string;
};

/** Extrae Id. documento y URL de respuestas create_doc/update_doc (variantes de mayúsculas / tipos). */
export function parseCreateDocBearerPayload(raw: unknown): {
  success: boolean;
  message?: string;
  idDocumento?: number;
  urlDocumento?: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { success: false, message: "Respuesta del proveedor inválida." };
  }
  const o = raw as Record<string, unknown>;
  const success =
    o.Success === true ||
    o.success === true ||
    o.Success === 1 ||
    o.success === 1;
  const msgCandidates = [o.Message, o.message, o.Error, o.error];
  const message = msgCandidates.find((m): m is string => typeof m === "string" && m.length > 0);
  const data = o.Data ?? o.data;
  let idDocumento: number | undefined;
  let urlDocumento: string | null | undefined;
  const readIdAndUrl = (src: Record<string, unknown>) => {
    const rawId = src.IdDocumento ?? src.idDocumento ?? src.IDDocumento;
    if (typeof rawId === "number" && Number.isFinite(rawId)) idDocumento = rawId;
    else if (typeof rawId === "string") {
      const n = parseInt(rawId, 10);
      if (!Number.isNaN(n)) idDocumento = n;
    }
    const u = src.UrlDocumento ?? src.urlDocumento ?? src.URLDocumento;
    if (typeof u === "string") urlDocumento = u;
    else if (u == null) urlDocumento = null;
  };
  if (data && typeof data === "object") readIdAndUrl(data as Record<string, unknown>);
  if (idDocumento == null) readIdAndUrl(o);
  return { success, message, idDocumento, urlDocumento };
}

export type SignatureCoordinate = {
  x: number;
  y: number;
  firmante: number;
  nombre: string;
  pagina: number;
  altoPagina: number;
  AnchoPagina: number;
  xDoc: number;
  yDoc: number;
  position: number;
};

// --- 1 Registrar empresa ---

export type RegistrarEmpresaInput = {
  RazonSocial: string;
  RFC: string;
  Email: string;
};

export async function registrarEmpresa(
  input: RegistrarEmpresaInput,
): Promise<LegacyRegistrarResponse> {
  if (isDigidMocked()) return digidMock.mockRegistrarEmpresa(input);
  // Al usar la nueva función, ya nos devuelve el JSON parseado
  const data = await digidPostLegacy("RegistrarEmpresa", input);
  return data as LegacyRegistrarResponse;
}

// --- 2 Firmantes ---

export type CrearFirmanteInput = {
  IdClient: number;
  Name: string;
  Email?: string;
  Phone?: string;
  Rfc?: string;
  IsRepLegal?: boolean;
  AutoSign?: boolean;
  Id?: number;
};

export async function guardarFirmante(
  input: CrearFirmanteInput,
): Promise<BearerSuccessData<SaveSignatoryData>> {
  if (isDigidMocked()) return digidMock.mockGuardarFirmante(input);
  const res = await digidFetchBearer("signatory/save_signatory", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.json() as Promise<BearerSuccessData<SaveSignatoryData>>;
}

// --- 3 Crear documento ---

export async function crearDocumentoMultipart(form: FormData): Promise<
  BearerSuccessData<CreateDocData>
> {
  if (isDigidMocked()) return digidMock.mockCrearDocumentoMultipart(form);
  const res = await digidFetchBearer("create_doc", {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return {
      Success: false,
      Message: `create_doc: HTTP ${res.status} — respuesta no es JSON (${text.slice(0, 200)}${text.length > 200 ? "…" : ""})`,
    };
  }
  const p = parseCreateDocBearerPayload(raw);
  if (!p.success) {
    return {
      Success: false,
      Message: p.message ?? (!res.ok ? `HTTP ${res.status}` : "El proveedor rechazó la creación del documento."),
    };
  }
  if (p.idDocumento == null) {
    return {
      Success: false,
      Message: p.message ?? "El proveedor no devolvió IdDocumento.",
    };
  }
  return {
    Success: true,
    Data: {
      IdDocumento: p.idDocumento,
      UrlDocumento: p.urlDocumento ?? undefined,
    },
  };
}

// --- 4 Actualizar documento ---

export async function actualizarDocumentoMultipart(
  form: FormData,
): Promise<BearerSuccessData<CreateDocData>> {
  const res = await digidFetchBearer("update_doc", {
    method: "POST",
    body: form,
  });
  return res.json() as Promise<BearerSuccessData<CreateDocData>>;
}

// --- 5 Asignar firmantes ---

export async function asignarFirmantesDocumento(body: {
  IdClient: number;
  IdDocument: number;
  signatories: { id: number; kyc: boolean }[];
}): Promise<{ success: boolean; message?: string }> {
  if (isDigidMocked()) return digidMock.mockAsignarFirmantesDocumento(body);
  const payload = {
    IdClient: body.IdClient,
    IdDocument: body.IdDocument,
    signatories: body.signatories.map((s) => ({
      id: s.id,
      kyc: serializeDigidFlag(s.kyc),
    })),
  };
  const res = await digidFetchBearer("asignado/add_assigned_doc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await readJsonOrThrow(res, "add_assigned_doc");
  const { ok, message } = parseDigidBearerResult(data);
  return { success: ok, message };
}

// --- 6 Desasignar ---

export async function desasignarFirmante(body: {
  IdCliente: number;
  IdDocumento: number;
  IdFirmante: number;
}): Promise<LegacyRegistrarResponse> {
  const data = await digidPostLegacy("dDesAsignarFirmante", body);
  return data as LegacyRegistrarResponse;
}

export async function obtenerUrlFirmaDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  if (isDigidMocked()) return digidMock.mockObtenerUrlFirmaDocumento(body);
  const data = await digidPostLegacy("dURLFirmaDoc", body);
  return data as LegacyRegistrarResponse;
}

// --- 8 Enviar a firmar ---

export type EnviarFirmarInput = {
  IdDoc: number;
  IdClient: number;
  FolioPremium: boolean;
  TypeSign: 1 | 2;
  SignatureCoordinates: string;
  Remider?: number;
  ColorSign?: string;
  Observer?: string;
  ObserverName?: string;
  ObserverPhone?: string;
  ObserverAprove?: boolean;
};

export async function enviarAFirmar(
  input: EnviarFirmarInput,
): Promise<{ Success: boolean; Message?: string }> {
  if (isDigidMocked()) return digidMock.mockEnviarAFirmar(input);
  const { FolioPremium, ObserverAprove, ...rest } = input;
  const body: Record<string, unknown> = {
    ...rest,
    FolioPremium: serializeDigidFlag(FolioPremium),
  };
  if (ObserverAprove !== undefined) {
    body.ObserverAprove = serializeDigidFlag(ObserverAprove);
  }
  const res = await digidFetchBearer("send_doc", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await readJsonOrThrow(res, "send_doc");
  const { ok, message } = parseDigidBearerResult(data);
  return { Success: ok, Message: message };
}

// --- 9 Info documento ---

export async function infoDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  if (isDigidMocked()) return digidMock.mockInfoDocumento(body);
  const data = await digidPostLegacy("dInfoDocto", body);
  return data as LegacyRegistrarResponse;
}

// --- 10 Cancelar ---

export async function cancelarDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  const data = await digidPostLegacy("dCancelarDocumento", body);
  return data as LegacyRegistrarResponse;
}

export async function urlFirmaFirmante(body: {
  IdCliente: number;
  IdDocumento: number;
  IdFirmante: number;
}): Promise<LegacyRegistrarResponse> {
  if (isDigidMocked()) return digidMock.mockUrlFirmaFirmante(body);
  const data = await digidPostLegacy("dObtenerURLFirmante", body);
  return data as LegacyRegistrarResponse;
}

export async function reenviarDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
  IdFirmante: number;
}): Promise<LegacyRegistrarResponse> {
  if (isDigidMocked()) return digidMock.mockReenviarDocumento();
  const data = await digidPostLegacy("dReEnviarDocumento", body);
  return data as LegacyRegistrarResponse;
}

// --- 16 Webhook ---

export async function registrarWebhook(body: {
  IdClient: number;
  Url: string;
}): Promise<{ success: boolean; message?: string }> {
  if (isDigidMocked()) return digidMock.mockRegistrarWebhook(body);
  const res = await digidFetchBearer("add_webhook", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await readJsonOrThrow(res, "add_webhook");
  const { ok, message } = parseDigidBearerResult(data);
  return { success: ok, message };
}

// --- 17 KYC ---

export async function kycOnOff(body: {
  IdClient: number;
  IdDocument: number;
  IdSignatory: number;
  kyc: boolean;
}): Promise<{ Success: boolean; Message?: string }> {
  const res = await digidFetchBearer("asignaciones/kyc_on_off", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ Success: boolean; Message?: string }>;
}

// --- 18 Certificar / constancia ---

export type CertificarDocumentoResult =
  | { responseType: "pdf"; buffer: ArrayBuffer }
  | { responseType: "json"; body: { Success: boolean; Message?: string } };

/**
 * DIGID puede responder JSON o PDF según ambiente. Se lee el cuerpo una sola vez.
 */
export async function certificarDocumento(form: FormData): Promise<CertificarDocumentoResult> {
  if (isDigidMocked()) return digidMock.mockCertificarDocumento(form);
  const res = await digidFetchBearer("certify_doc", {
    method: "POST",
    body: form,
  });
  const buffer = await res.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 4));
  const isPdf =
    head.length >= 4 &&
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46;
  if (isPdf) {
    return { responseType: "pdf", buffer };
  }
  try {
    const text = new TextDecoder().decode(buffer);
    const body = JSON.parse(text) as { Success: boolean; Message?: string };
    return { responseType: "json", body };
  } catch {
    throw new Error("certify_doc: la respuesta no es un PDF válido ni JSON reconocible.");
  }
}

// --- 13–15 Plantillas (Bearer; rutas según docs/api-digid.md) ---

/** Multipart típico: Name/NameDoc, IdClient, File docx, Anexos, etc. */
export async function crearPlantillaMultipart(
  form: FormData,
): Promise<Record<string, unknown>> {
  const res = await digidFetchBearer("create_template", {
    method: "POST",
    body: form,
  });
  return res.json() as Promise<Record<string, unknown>>;
}

/** Multipart con IdTemplate, IdClient, NameDoc, FileDoc, Anexos, etc. */
export async function actualizarPlantillaMultipart(
  form: FormData,
): Promise<Record<string, unknown>> {
  const res = await digidFetchBearer("update_template", {
    method: "POST",
    body: form,
  });
  return res.json() as Promise<Record<string, unknown>>;
}

/** JSON: metadatos y parámetros de una plantilla existente. */
export async function obtenerDetallePlantilla(body: {
  IdClient: number;
  IdTemplate: number;
}): Promise<Record<string, unknown>> {
  const res = await digidFetchBearer("get_template", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonOrThrow(res, "get_template");
}

export function buildSignatureCoordinatesJson(
  items: SignatureCoordinate[],
): string {
  return JSON.stringify(items);
}
