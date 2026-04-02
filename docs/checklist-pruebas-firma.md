# Checklist: prueba de firma end-to-end (Juxa Sign)

Sigue este orden en la app local (`npm run dev`) con credenciales DIGID de **pruebas** (`Modo=T`, bases `dev.digidmexico.com.mx`).

## Pre-requisitos

1. PostgreSQL en marcha (p. ej. `npm run db:docker` y `npm run db:push`).
2. Archivo `.env` con `DATABASE_URL` y todas las variables `DIGID_*` de [`.env.example`](../.env.example).
3. `npm run check:env` para validar variables mínimas (no muestra secretos).
4. `npm run build` sin errores (opcional pero recomendado antes de demos).

En la app también puedes abrir la ruta **`/prueba-e2e`** para ver este checklist renderizado.

## Flujo en la aplicación

| Paso | Pantalla / acción | API DIGID (referencia) |
|------|-------------------|-------------------------|
| 1 | **Empresas** → Nueva empresa | 1 `RegistrarEmpresa` |
| 2 | **Firmantes** → elegir empresa → Nuevo firmante (email o teléfono) | 2.1 `save_signatory` |
| 3 | **Documentos** → Subir PDF | 3 `create_doc` |
| 4 | **Visor** del documento → zoom **100%** → Modo marcar ON → clic en posición de firma | (coordenadas locales → API 8) |
| 5 | **Enviar** → Asignar firmantes (mismos ids que en las marcas) | 5 `add_assigned_doc` |
| 6 | **Enviar** → Enviar a firmar (tipo firma, color, **recordatorio** 24/48/72 h) | 8 `send_doc` |
| 7 | **Enviar** → Generar URLs por firmante o pantalla DIGID | 11 / 7 |
| 8 | Abrir URL en navegador y completar firma en DIGID | — |
| 9 | (Opcional) Sincronizar estado en el visor o webhook + túnel | 9 / 16 |

## Si algo falla

- **send_doc:** revisa mensaje DIGID; `FolioPremium` y `kyc` usan `0`/`1` por defecto; si el sandbox exige booleanos, define `DIGID_FLAG_SERIALIZATION=boolean` en `.env`.
- **add_assigned_doc:** mismo criterio que `kyc` (numérico vs booleano) vía `DIGID_FLAG_SERIALIZATION`.
- **PDF en blanco en el visor:** revisa consola; el worker debe cargar desde unpkg.
- **Proxy PDF 403:** la `UrlDocumento` debe ser de host `digidmexico.com.mx` o `dev.digidmexico.com.mx`.
- **fetch a UrlDocumento falla (certify):** la URL podría requerir sesión; probar otro PDF o flujo según soporte DIGID.

## Documentación de contratos

Ver [api-digid.md](./api-digid.md) como fuente de verdad de endpoints.
