/**
 * Cliente DIGID — solo servidor. Ver docs/api-digid.md
 */

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
    throw new Error(`Faltan variables de entorno DIGID: ${missing.join(", ")}`);
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

export async function digidPostLegacy(
  action: string,
  body: Record<string, unknown>,
): Promise<Response> {
  assertDigidEnv();
  const base = trimBase(process.env.DIGID_LEGACY_BASE!);
  const url = `${base}/${action.replace(/^\//, "")}`;
  const payload = {
    Usuario: process.env.DIGID_USUARIO,
    Clave: process.env.DIGID_CLAVE,
    Token: process.env.DIGID_TOKEN,
    Modo: process.env.DIGID_MODO,
    ...body,
  };
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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
  const res = await digidPostLegacy("RegistrarEmpresa", input);
  return res.json() as Promise<LegacyRegistrarResponse>;
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
  const res = await digidFetchBearer("create_doc", {
    method: "POST",
    body: form,
  });
  return res.json() as Promise<BearerSuccessData<CreateDocData>>;
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
  const res = await digidPostLegacy("dDesAsignarFirmante", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
}

// --- 7 URL firma doc ---

export async function obtenerUrlFirmaDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  const res = await digidPostLegacy("dURLFirmaDoc", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
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
  const res = await digidPostLegacy("dInfoDocto", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
}

// --- 10 Cancelar ---

export async function cancelarDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  const res = await digidPostLegacy("dCancelarDocumento", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
}

// --- 11 URL firmante ---

export async function urlFirmaFirmante(body: {
  IdCliente: number;
  IdDocumento: number;
  IdFirmante: number;
}): Promise<LegacyRegistrarResponse> {
  const res = await digidPostLegacy("dObtenerURLFirmante", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
}

// --- 12 Reenviar ---

export async function reenviarDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
  IdFirmante: number;
}): Promise<LegacyRegistrarResponse> {
  const res = await digidPostLegacy("dReEnviarDocumento", body);
  return res.json() as Promise<LegacyRegistrarResponse>;
}

// --- 16 Webhook ---

export async function registrarWebhook(body: {
  IdClient: number;
  Url: string;
}): Promise<{ success: boolean; message?: string }> {
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
