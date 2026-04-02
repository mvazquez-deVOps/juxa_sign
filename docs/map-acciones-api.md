# Server Actions → API DIGID

Referencia rápida entre acciones del panel y llamadas DIGID. Detalle de payloads: [api-digid.md](api-digid.md).

| Server Action / flujo | Endpoint / método DIGID | Notas |
| --------------------- | ------------------------ | ----- |
| `createCompany` | Legacy `RegistrarEmpresa` | Devuelve IdClient |
| `saveSignatory` | Bearer `signatory/save_signatory` | |
| `uploadDocument` | Bearer `create_doc` | Multipart |
| (no expuesto en panel) | Bearer `update_doc` | Ver `lib/digid.ts` |
| `assignSignatoriesToDocument` | Bearer `asignado/add_assigned_doc` | Reemplaza asignación |
| `sendDocumentForSigning` | Bearer `send_doc` | Coordenadas + `Remider`, `FolioPremium`, etc. |
| `refreshDocumentStatus` | Legacy `dInfoDocto` | Sincroniza `status` en Prisma |
| `getBulkSignerUrls` | Legacy `dObtenerURLFirmante` | Por firmante |
| `getLayoutSignerUrl` | Legacy `dURLFirmaDoc` | Pantalla general |
| `registerDigidWebhook` | Bearer `add_webhook` | URL pública + opcional `?secret=` |
| `certifyStoredDocument` | Bearer `certify_doc` | Descarga PDF con Bearer si aplica |
| Webhook entrante | — | `POST /api/webhooks/digid` |

Cancelaciones u otras APIs legacy no expuestas aún en el panel pueden añadirse siguiendo el mismo patrón en `lib/digid.ts`.
