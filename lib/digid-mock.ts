/**
 * Respuestas DIGID sintéticas para desarrollo sin sandbox (DIGID_MOCK o modo memoria).
 */
import { signingLinkBaseUrl } from "@/lib/app-base-url";
import { isMemoryDataStore } from "@/lib/data/mode";
import { memoryDocumentFindFirstByDigidId } from "@/lib/store/memory-store";

type LegacyRegistrarResponse = {
  Codigo: number;
  ExtraInfo?: { Id?: string; Descripcion?: string; URL?: string; estado?: string };
};

type BearerSuccessData<T> = {
  Success: boolean;
  Message?: string;
  Data?: T;
};

type SaveSignatoryData = { id: number; name?: string; RL?: number; newSignatory?: boolean };
type CreateDocData = { IdDocumento: number; UrlDocumento?: string };
type EnviarFirmarInput = Record<string, unknown>;
type RegistrarEmpresaInput = { RazonSocial: string; RFC: string; Email: string };

let nextClientId = 95000;
let nextDocId = 96000;
let nextSignatoryId = 97000;

export function mockRegistrarEmpresa(input: RegistrarEmpresaInput): Promise<LegacyRegistrarResponse> {
  void input;
  nextClientId += 1;
  return Promise.resolve({
    Codigo: 200,
    ExtraInfo: { Id: String(nextClientId), Descripcion: "Mock DIGID" },
  });
}

export function mockGuardarFirmante(input: {
  IdClient: number;
  Name: string;
  Email?: string;
  Phone?: string;
  Rfc?: string;
  IsRepLegal?: boolean;
  AutoSign?: boolean;
  Id?: number;
}): Promise<BearerSuccessData<SaveSignatoryData>> {
  void input;
  const id = input.Id ?? ++nextSignatoryId;
  return Promise.resolve({
    Success: true,
    Data: { id },
  });
}

export function mockCrearDocumentoMultipart(
  _form: FormData,
): Promise<BearerSuccessData<CreateDocData>> {
  nextDocId += 1;
  const data: CreateDocData = {
    IdDocumento: nextDocId,
    UrlDocumento: `${signingLinkBaseUrl()}/firma-prueba`,
  };
  return Promise.resolve({ Success: true, Data: data });
}

export function mockAsignarFirmantesDocumento(
  _body: unknown,
): Promise<{ success: boolean; message?: string }> {
  return Promise.resolve({ success: true });
}

export function mockEnviarAFirmar(
  _input: EnviarFirmarInput,
): Promise<{ Success: boolean; Message?: string }> {
  return Promise.resolve({ Success: true });
}

export function mockReenviarDocumento(): Promise<LegacyRegistrarResponse> {
  return Promise.resolve({ Codigo: 200, ExtraInfo: { Descripcion: "Mock reenvío" } });
}

export function mockInfoDocumento(body: {
  IdCliente: number;
  IdDocumento: number;
}): Promise<LegacyRegistrarResponse> {
  const row = isMemoryDataStore() ? memoryDocumentFindFirstByDigidId(body.IdDocumento) : null;
  const estado = row?.status ?? "En proceso";
  return Promise.resolve({
    Codigo: 200,
    ExtraInfo: { estado } as unknown as LegacyRegistrarResponse["ExtraInfo"],
  });
}

export function mockUrlFirmaFirmante(
  _body: { IdCliente: number; IdDocumento: number; IdFirmante: number },
): Promise<LegacyRegistrarResponse> {
  return Promise.resolve({
    Codigo: 200,
    ExtraInfo: { URL: `${signingLinkBaseUrl()}/demo-sample.pdf?rol=firmante` },
  });
}

export function mockObtenerUrlFirmaDocumento(
  _body: { IdCliente: number; IdDocumento: number },
): Promise<LegacyRegistrarResponse> {
  return Promise.resolve({
    Codigo: 200,
    ExtraInfo: { URL: `${signingLinkBaseUrl()}/firma-prueba?rol=disposicion` },
  });
}

export function mockRegistrarWebhook(
  _body: unknown,
): Promise<{ success: boolean; message?: string }> {
  return Promise.resolve({ success: true });
}

export async function mockCertificarDocumento(_form: FormData): Promise<
  | { responseType: "pdf"; buffer: ArrayBuffer }
  | { responseType: "json"; body: { Success: boolean; Message?: string } }
> {
  return {
    responseType: "json",
    body: { Success: true, Message: "Constancia aceptada (mock DIGID)." },
  };
}
