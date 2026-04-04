import { dbFindDocumentDetailInOrg, dbFindDocumentInOrg } from "@/lib/data/repository";

/** Documento accesible solo si la empresa pertenece a la organización. */
export async function findDocumentInOrg(documentId: string, organizationId: string) {
  return dbFindDocumentInOrg(documentId, organizationId);
}

/** Variante con marcas + signatarios para el visor. */
export async function findDocumentDetailInOrg(documentId: string, organizationId: string) {
  return dbFindDocumentDetailInOrg(documentId, organizationId);
}
