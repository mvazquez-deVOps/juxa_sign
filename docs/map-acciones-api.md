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
| Webhook entrante | — | `POST /api/webhooks/digid` · idempotencia 7 días por hash de cuerpo + cabecera delivery; parse tolerante en `lib/webhook-parse.ts` |
| Health / smoke | — | `GET` o `HEAD` `/api/health` (sin DB; ver [despliegue.md](./despliegue.md)) |
| Acceso demo | — | `POST /api/demo-auth` (cookie `juxa_demo_session`), `POST /api/demo-auth/logout` |
| Sesión en servidor | — | `resolveSession()` en `lib/session.ts` (NextAuth o sesión demo + `DEMO_ORGANIZATION_ID`) usada por `gateMutation` y páginas vía `requireOrgContext` |

Cancelaciones u otras APIs legacy no expuestas aún en el panel pueden añadirse siguiendo el mismo patrón en `lib/digid.ts`.
