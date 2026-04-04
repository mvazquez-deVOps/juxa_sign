# Flujo de producto (Juxa Sign + DIGID)

**La guía canónica en la aplicación es la ruta `/flujo-producto`** (implementación: `app/flujo-producto/page.tsx` en el repo). Este archivo es un resumen para GitHub y enlaces externos; no dupliques aquí el texto largo del panel.

- **Actores:** operador del panel (esta app) y firmante DIGID (fuera del repo).
- **Happy path:** Clientes (DIGID `RegistrarEmpresa`) → Firmantes → Documento nuevo → visor y marcas → Enviar → URLs; webhooks actualizan estado.
- **Prisma vs DIGID:** metadatos, mapeos de IDs, marcas y estado sincronizado en Prisma; PDF y flujo de firma en DIGID.
- **Folios:** `folioBalance` + `FolioLedgerEntry`; UI `/folios`, `/folios/planes`; plataforma `/superadmin/folios`.

Detalle de API: [map-acciones-api.md](./map-acciones-api.md), [api-digid.md](./api-digid.md). Incidencias: [runbook-fallos.md](./runbook-fallos.md). Planes: [planes-y-facturacion.md](./planes-y-facturacion.md).
