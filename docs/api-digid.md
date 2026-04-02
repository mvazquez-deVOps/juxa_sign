# DIGID — Diccionario de API (descripciones y URLs directas)

Fuente de verdad para integración y depuración en Juxa Sign. Para el flujo de prueba en la app, ver también [checklist-pruebas-firma.md](./checklist-pruebas-firma.md).

## Bases URL

| Tipo | Producción | Pruebas (sandbox) |
| ---- | ---------- | ----------------- |
| API Bearer + multipart | `https://digidmexico.com.mx/api/ws` | `https://dev.digidmexico.com.mx/api/ws` |
| Legacy (JSON con credenciales en body) | `https://digidmexico.com.mx/wsdigid3/public/index.php` | `https://dev.digidmexico.com.mx/wsdigid3/public/index.php` |

- En **`/api/ws`**: encabezado `Authorization: Bearer <token>` y cuerpo JSON, salvo cuando se suben archivos (form-data / multipart).
- En **legacy**: cuerpo JSON con campos comunes `Usuario`, `Clave`, `Token`, `Modo` (`T` = pruebas, `P` = producción).

---

## Índice

| # | Tema |
| - | ---- |
| 1 | [Registrar empresa (cliente)](#1-registrar-empresa-cliente) |
| 2 | [Firmantes](#2-firmantes) — [2.1 Crear](#21-crear-firmante) · [2.2 Actualizar y consultar](#22-actualizar-firmante-y-consultar-firmante) |
| 3 | [Crear documento](#3-crear-documento) |
| 4 | [Actualizar documento](#4-actualizar-documento) |
| 5 | [Asignar firmantes a documento](#5-asignar-firmantes-a-documento) |
| 6 | [Desasignar firmante](#6-desasignar-firmante) |
| 7 | [Obtener URL para enviar documento](#7-obtener-url-para-enviar-documento) |
| 8 | [Enviar a firmar](#8-enviar-a-firmar) |
| 9 | [Información del documento y estatus de firmantes](#9-información-del-documento-y-estatus-de-firmantes) |
| 10 | [Cancelar documento](#10-cancelar-documento) |
| 11 | [URL directa de firma para firmante](#11-url-directa-de-firma-para-firmante) |
| 12 | [Reenviar documento por correo para firma](#12-reenviar-documento-por-correo-para-firma) |
| 13 | [Crear plantilla](#13-crear-plantilla) |
| 14 | [Actualizar plantilla](#14-actualizar-plantilla) |
| 15 | [Obtener detalles de plantilla](#15-obtener-detalles-de-plantilla) |
| 16 | [Configurar webhook de notificaciones](#16-configurar-webhook-de-notificaciones) |
| 17 | [Asignaciones — KYC on/off](#17-asignaciones--kyc-onoff) |
| 18 | [Obtener constancia a partir de un documento](#18-obtener-constancia-a-partir-de-un-documento) |

---

## 1. Registrar empresa (cliente)

**Descripción:** Registra un cliente nuevo en DIGID.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/RegistrarEmpresa`

### Body JSON

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| Usuario | string(15) | Sí | Usuario WS DIGID |
| Clave | string(15) | Sí | Clave WS DIGID |
| Token | string(32) | Sí | Token del usuario |
| RazonSocial | string | Sí | Razón social |
| RFC | string | Sí | RFC |
| Email | string | Sí | Correo |
| Modo | string | Sí | `T` = Test / `P` = Producción |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "RazonSocial": "ACME SA de CV",
  "RFC": "XAXX010101000",
  "Email": "contacto@acme.com",
  "Modo": "T"
}
```

### Ejemplo respuesta 200

```json
{ "Codigo": 200, "ExtraInfo": { "Id": "1172" } }
```

### Respuestas esperadas

| Código | Significado | Ejemplo |
| ------ | ----------- | ------- |
| 200 | Alta exitosa | `{"Codigo":200,"ExtraInfo":{"Id":"1172"}}` |
| 300 | Credenciales inválidas | `{"Codigo":300,"ExtraInfo":{"Descripcion":"Credenciales incorrectas"}}` |
| 400 | Empresa ya registrada | `{"Codigo":400,"ExtraInfo":{"Descripcion":"Ya se ha registrado esta empresa","Id":"1172"}}` |

---

## 2. Firmantes

Gestión de firmantes de un cliente.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/signatory/save_signatory`  
- **Auth:** Bearer + body JSON

### 2.1 Crear firmante

**Descripción:** Crea un firmante nuevo. Puede ser por Email, Phone o ambos. Si ya existe un firmante con el mismo Email (o, si no hay Email, con el mismo Phone) dentro del mismo `IdClient`, no duplica: actualiza y devuelve el existente.

#### Body JSON (crear)

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| IdClient | number | Sí | Id del cliente |
| Name | string | Sí | Nombre del firmante |
| Email | string | Cond. | Obligatorio si no se envía Phone |
| Phone | string | Cond. | Obligatorio si no se envía Email |
| Rfc | string | No | RFC del firmante |
| IsRepLegal | boolean | No | Representante legal |
| AutoSign | boolean | No | Firma automática |

#### Ejemplo request (crear)

```json
{
  "IdClient": 1172,
  "Name": "DIGID MEXICO",
  "Phone": "9999039195",
  "IsRepLegal": false
}
```

#### Ejemplos respuesta

Creado:

```json
{
  "Success": true,
  "Data": { "id": 4419, "name": "DIGID MEXICO - Sin RFC" }
}
```

Existente (no duplica):

```json
{
  "Success": true,
  "Data": {
    "id": 4419,
    "name": "DIGID MEXICO",
    "RL": 1,
    "newSignatory": false
  }
}
```

Error validación:

```json
{
  "Success": false,
  "Message": "El correo es obligatorio si no se proporciona teléfono. (and 1 more error)"
}
```

IdCliente incorrecto:

```json
{
  "Message": "IdCliente no pertenece al distribuidor, verifique sus datos",
  "Success": false
}
```

#### Respuestas esperadas

| Campo / situación | Significado |
| ----------------- | ----------- |
| `Success: true` | Creado o devolvió existente (no duplica) |
| `Success: false` | Error de validación u otro error |

---

### 2.2 Actualizar firmante y consultar firmante

**Descripción:** Actualiza un firmante existente. Requiere `Id` y, por política del servicio, enviar **todos** los parámetros del firmante (se sobrescriben los valores).

#### Body JSON (actualizar)

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| Id | number | Sí | Id del firmante a actualizar |
| IdClient | number | Sí | Id del cliente |
| Name | string | Sí | Nombre del firmante |
| Email | string | Cond. | Correo del firmante |
| Phone | string | Cond. | Teléfono del firmante |
| Rfc | string | No | RFC del firmante |
| IsRepLegal | boolean | No | Representante legal |
| AutoSign | boolean | No | Firma automática |

#### Ejemplo request (actualizar)

```json
{
  "Id": 4419,
  "IdClient": 1172,
  "Name": "DIGID MEXICO",
  "Email": "mario@example.com",
  "Phone": "9999039195",
  "Rfc": "XAXX010101000",
  "IsRepLegal": false,
  "AutoSign": false
}
```

#### Ejemplo respuesta (actualizado)

```json
{
  "Success": true,
  "Data": { "id": 4419, "name": "DIGID MEXICO - XAXX010101000" }
}
```

#### Respuestas esperadas

| Campo / situación | Significado |
| ----------------- | ----------- |
| `Success: true` | Actualizado correctamente |
| `Success: false` | Error de validación o falta de campos (ej. "Falta Id o campos del firmante") |

---

## 3. Crear documento

**Descripción:** Crea un documento nuevo, para posteriormente enviar a firmar.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/create_doc`  
- **Body:** form-data o JSON (Bearer)

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| NameDoc | string(100) | Sí | Nombre del archivo |
| IdClient | number | Sí | Id del cliente |
| UseTemplate | boolean | Sí | `true` plantilla, `false` archivo |
| FileDoc | file | Cond. | Obligatorio si `UseTemplate=false`. Solo PDF y docx |
| IdTemplate | number | Cond. | Obligatorio si `UseTemplate=true` |
| Anexos | file | No | PDFs adicionales |
| Parametros | JSON (texto) | Cond. | Obligatorio si `UseTemplate=true` |

### Ejemplo JSON (plantilla)

```json
{
  "NameDoc": "Contrato servicio",
  "IdClient": 1172,
  "UseTemplate": true,
  "IdTemplate": 55,
  "Parametros": { "cliente": "ACME", "monto": "$10,000" }
}
```

### Ejemplo respuesta success true

```json
{
  "Success": true,
  "Data": {
    "IdDocumento": 17388,
    "UrlDocumento": "https://digidmexico.com.mx/documents/verarchivo/17388"
  }
}
```

### Ejemplos success false

- Sin parámetro requerido: `"Message": "Es requerido un documento .pdf o .docx, para poder continuar"`
- Archivo inválido: `"Message": "El Formato es incorrecto"`

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Creado |
| `Success: false` | Error de validación (`Message` describe el fallo) |

---

## 4. Actualizar documento

**Descripción:** Actualiza un documento existente. Requiere `IdDoc`. Mismas reglas de plantilla/archivo que en creación.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/update_doc`

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| NameDoc | string(100) | Sí | Nombre |
| IdClient | number | Sí | Id del cliente |
| UseTemplate | boolean | Sí | `true` plantilla, `false` archivo |
| FileDoc | file | Cond. | Obligatorio si `UseTemplate=false`. Solo PDF |
| IdDoc | number | Sí | Id del documento |
| IdTemplate | number | Cond. | Obligatorio si `UseTemplate=true` |
| Anexos | file | No | PDFs |
| Parametros | JSON (texto) | Cond. | Obligatorio si `UseTemplate=true` |

### Ejemplo JSON

```json
{
  "IdDoc": 17388,
  "NameDoc": "Contrato servicio v2",
  "IdClient": 1172,
  "UseTemplate": false
}
```

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Actualizado (`Data` con detalles) |
| `Success: false` | Error (ej. falta `IdDoc`) |

---

## 5. Asignar firmantes a documento

**Descripción:** Asigna firmantes al documento, **reemplazando la asignación completa**.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/asignado/add_assigned_doc`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| IdClient | number | Sí |
| IdDocument | number | Sí |
| signatories | array | Sí |

### Dentro de cada elemento de `signatories`

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| id | number | Sí | Id del firmante |
| kyc | number | Sí | Si requiere KYC (en manual; ejemplos a veces usan boolean — ver notas Juxa Sign abajo) |

### Ejemplo body

```json
{
  "IdClient": 1172,
  "IdDocument": 17388,
  "signatories": [
    { "id": 4419, "kyc": 0 },
    { "id": 4420, "kyc": 0 }
  ]
}
```

> En el manual original aparece `"kyc": false` en JSON; la tabla indica tipo numérico. Juxa Sign serializa por defecto **0/1**; ver [Notas para Juxa Sign](#notas-para-juxa-sign).

### Respuestas esperadas

| Campo | Significado | Ejemplo |
| ----- | ----------- | ------- |
| `success: true` | Asignado | `{"success":true,"message":"Firmantes agregados correctamente al documento."}` |
| `success: false` | Error | `{"success":false,"message":"Documento no existe"}` |

---

## 6. Desasignar firmante

**Descripción:** Elimina la asignación de un firmante del documento.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dDesAsignarFirmante`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| IdFirmante | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "IdFirmante": 4419,
  "Modo": "P"
}
```

### Ejemplo respuesta 200

```json
{ "Codigo": 200, "ExtraInfo": { "Descripcion": "Ok" } }
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Desasignado |
| 500 | No existe / credenciales inválidas (según entorno) |

---

## 7. Obtener URL para enviar documento

**Descripción:** Genera la URL de la pantalla para elegir tipo de folio, tipo de firma y colocar firmas.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dURLFirmaDoc`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "Modo": "P"
}
```

### Ejemplo respuesta 200

```json
{
  "Codigo": 200,
  "ExtraInfo": {
    "Clave": "20806",
    "nombredocumento": "DIGID Prueba de firma",
    "URL": "https://digidmexico.com.mx/firma_pagina/..."
  }
}
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Obtenido |
| 400 | No existe |
| 500 | Parámetros inválidos |

---

## 8. Enviar a firmar

**Descripción:** Envía el documento para comenzar el proceso de firma.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/send_doc`

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| IdDoc | number | Sí | Id del documento |
| IdClient | number | Sí | Id del cliente |
| FolioPremium | boolean / 0-1 | Sí | Certificación NOM-151 (ejemplo oficial usa `0`) |
| TypeSign | number | Sí | `1` electrónica, `2` autógrafa |
| SignatureCoordinates | string (JSON) | Sí | Posiciones de firma (ver más abajo) |
| Remider | number | No | Recordatorio: `1` = 24 h, `2` = 48 h, `3` = 72 h |
| ColorSign | string | No | Hex `#RRGGBB` (7 caracteres con `#`). Ej.: `#000000`, `#1F2937`, `#FF0000`. Si no se envía en firma autógrafa, la plataforma puede usar negro por defecto. |
| Observer | string | No | Email observador |
| ObserverName | string | No | Nombre observador (**obligatorio si** usas Observer) |
| ObserverPhone | string | No | Teléfono observador |
| ObserverAprove | boolean | No | Aprobación |

### Observer

No es obligatorio. Si se incluye observador, es obligatorio **Observer** (email) y **ObserverName**. `ObserverPhone` y `ObserverAprove` son opcionales.

### SignatureCoordinates

Cadena que contiene un **arreglo JSON serializado**. Cada elemento describe una firma en el PDF (una firma = un objeto). Campos por objeto:

| Campo | Descripción |
| ----- | ----------- |
| `x` | Coordenada horizontal en píxeles desde la esquina **superior izquierda** hacia la derecha. |
| `y` | Coordenada vertical en píxeles desde la esquina **superior izquierda** hacia abajo. |
| `firmante` | Id numérico del firmante (mismo id que en alta de firmante). |
| `nombre` | Texto junto a la firma (suele coincidir con el nombre del firmante). |
| `pagina` | Número de página (**1-indexado**). |
| `altoPagina` | Altura de página en píxeles usada al calcular; debe ser consistente con el PDF renderizado. |
| `AnchoPagina` | Ancho de página en píxeles; igual criterio que `altoPagina`. |
| `xDoc` | Mismo valor que `x` (referencia interna al documento original). |
| `yDoc` | Mismo valor que `y`. |
| `position` | Posición u orientación u orden cuando hay varias firmas. |

### Ejemplo con dos firmas (cadena escapada como la espera la API)

```json
"SignatureCoordinates": "[{\"x\":160.5,\"y\":280.0,\"firmante\":510,\"nombre\":\"Ana López\",\"pagina\":1,\"altoPagina\":1145,\"AnchoPagina\":810,\"xDoc\":160.5,\"yDoc\":280.0,\"position\":0},{\"x\":420.0,\"y\":900.0,\"firmante\":511,\"nombre\":\"Carlos Herrera\",\"pagina\":2,\"altoPagina\":1145,\"AnchoPagina\":810,\"xDoc\":420.0,\"yDoc\":900.0,\"position\":0}]"
```

### Ejemplo body completo

```json
{
  "IdDoc": 17388,
  "IdClient": 1172,
  "FolioPremium": 0,
  "TypeSign": 2,
  "SignatureCoordinates": "[{\"x\":200,\"y\":225,\"firmante\":4419,\"nombre\":\"DIGID MEXICO\",\"pagina\":1,\"altoPagina\":1048,\"AnchoPagina\":612,\"xDoc\":200,\"yDoc\":225,\"position\":0}]",
  "Remider": 1,
  "ColorSign": "#000000"
}
```

### Respuestas esperadas

| Campo | Significado | Ejemplo |
| ----- | ----------- | ------- |
| `Success: true` | Enviado | `{"Success": true}` |
| `Success: false` | Error | `{"Success": false, "Message": "Documento sin firmantes"}` |

---

## 9. Información del documento y estatus de firmantes

**Descripción:** Devuelve resumen del documento y estado por firmante.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dInfoDocto`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "Modo": "P"
}
```

### Ejemplo respuesta 200

```json
{
  "Codigo": 200,
  "ExtraInfo": {
    "nombre": "CONTRATO",
    "estado": "En Proceso de Firma",
    "tipofirma": "Autógrafa",
    "tipofolio": "Sencillo",
    "URLDocumento": "https://digidmexico.com.mx/documents/verarchivo/17388",
    "firmantes": [
      {
        "id": "4419",
        "nombre": "DIGID MEXICO",
        "estatus": "Documento Firmado"
      }
    ]
  }
}
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Obtenido |
| 400 | No existe |
| 500 | Parámetros inválidos |

---

## 10. Cancelar documento

**Descripción:** Cancela un documento que no ha concluido.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dCancelarDocumento`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "Modo": "T"
}
```

### Ejemplo respuesta 200

```json
{ "Codigo": 200, "ExtraInfo": { "Descripcion": "Documento cancelado" } }
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Cancelado |
| 400 | No existe |
| 500 | Parámetros inválidos |

---

## 11. URL directa de firma para firmante

**Descripción:** Genera la URL para que un firmante firme directamente.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dObtenerURLFirmante`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| IdFirmante | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "IdFirmante": 4419,
  "Modo": "P"
}
```

### Ejemplo respuesta 200

```json
{
  "Codigo": 200,
  "ExtraInfo": { "URL": "https://digidmexico.com.mx/firma_autografa/..." }
}
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Obtenido |
| 400 | Firmante no registrado / no existe |
| 500 | Parámetros inválidos |

---

## 12. Reenviar documento por correo para firma

**Descripción:** Reenvía por correo el enlace de firma al firmante indicado.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/wsdigid3/public/index.php/dReEnviarDocumento`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| Usuario | string(15) | Sí |
| Clave | string(15) | Sí |
| Token | string(32) | Sí |
| IdCliente | number | Sí |
| IdDocumento | number | Sí |
| IdFirmante | number | Sí |
| Modo | T/P | Sí |

### Ejemplo request

```json
{
  "Usuario": "demo",
  "Clave": "demo123",
  "Token": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "IdCliente": 1172,
  "IdDocumento": 17388,
  "IdFirmante": 4419,
  "Modo": "P"
}
```

### Ejemplo respuesta 200

```json
{ "Codigo": 200, "ExtraInfo": { "Descripcion": "Documento Enviado" } }
```

### Respuestas esperadas

| Código | Significado |
| ------ | ----------- |
| 200 | Reenviado |
| 400 | Firmante no registrado |
| 500 | Parámetros inválidos |

---

## 13. Crear plantilla

**Descripción:** Permite reutilizar un documento con campos dinámicos (parámetros).

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/create_template`  
- **Body:** según manual de plantillas (típicamente multipart con archivo docx).

Resumen de campos citados en el diccionario (validar contra manual oficial si difiere):

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| NameDoc / Name | string | Sí | Nombre de plantilla |
| IdClient | number / string | Sí | Id del cliente |
| File | file | Sí | Archivo docx |
| Anexos | boolean | Sí | Si admite anexos |

### Ejemplo JSON (metadatos; el archivo suele ir en multipart)

```json
{ "Name": "Contrato Base", "Anexos": false }
```

### Ejemplo success true

```json
{
  "Success": true,
  "IdTemplate": 667,
  "Variables": [{ "P1": "P1" }, { "p2_COMPRADOR": "p2_COMPRADOR" }, { "p3_NUMERO": "p3_NUMERO" }],
  "Preview": "https://digidmexico.com.mx/templates/verarchivo/667"
}
```

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Creada |
| `Success: false` | Error |

---

## 14. Actualizar plantilla

**Descripción:** Modifica una plantilla existente con `IdTemplate`.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/update_template`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| NameDoc | string | Sí |
| IdClient | int | Sí |
| IdTemplate | int | Sí |
| FileDoc | file | Sí |
| Anexos | bool | Sí |

### Ejemplo JSON

```json
{
  "IdTemplate": 55,
  "IdClient": 1172,
  "NameDoc": "Contrato Demo v2",
  "Anexos": false
}
```

### Ejemplo success true

Igual estructura que en crear plantilla (`IdTemplate`, `Variables`, `Preview`, etc.).

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Actualizada |
| `Success: false` | Error |

---

## 15. Obtener detalles de plantilla

**Descripción:** Trae campos requeridos, metadatos y configuración.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/get_template`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| IdClient | number | Sí |
| IdTemplate | number | Sí |

### Ejemplo de respuesta (éxito)

```json
{
  "Success": true,
  "Templates": [
    {
      "id": 668,
      "nombre": "Plantilla Demo UPdate",
      "parametros": [{ "P1": "P1" }, { "p2_COMPRADOR": "p2_COMPRADOR" }, { "p3_NUMERO": "p3_NUMERO" }],
      "fecha_alta": "02-12-2025",
      "anexos": false,
      "preview": "https://digidmexico.com.mx/templates/verarchivo/668"
    }
  ]
}
```

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Devuelto |
| `Success: false` | Error |

---

## 16. Configurar webhook de notificaciones

**Descripción:** Recibir información de los documentos en tu URL.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/add_webhook`

| Campo | Tipo | Req. |
| ----- | ---- | ---- |
| IdClient | int | Sí |
| Url | string | Sí |

### Ejemplo JSON

```json
{ "IdClient": 11, "Url": "https://miapp.com/webhooks/digid" }
```

### Ejemplo respuesta

```json
{ "Success": true, "message": "WebHook URL agregada correctamente" }
```

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Registrado |
| `Success: false` | Error |

---

## 17. Asignaciones — KYC on/off

**Descripción:** Activa o desactiva validación KYC en asignaciones de firmantes.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/asignaciones/kyc_on_off`

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| IdClient | int | Sí | Id del cliente (empresa) |
| IdDocument | int | Sí | Id del documento |
| IdSignatory | int | Sí | Id del firmante |
| kyc | boolean | Sí | Activar / desactivar KYC |

### Ejemplo JSON

```json
{
  "IdClient": 1172,
  "IdDocument": 17388,
  "IdSignatory": 4419,
  "kyc": true
}
```

### Ejemplo respuesta

```json
{ "Success": true }
```

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| `Success: true` | Actualizado |
| `Success: false` | Error |

---

## 18. Obtener constancia a partir de un documento

**Descripción:** Certificar archivos digitales (mensajes de datos) bajo constancias de conservación NOM-151.

- **Método:** POST  
- **URL:** `https://digidmexico.com.mx/api/ws/certify_doc`  
- **Body:** form-data (Bearer)

| Campo | Tipo | Req. | Descripción |
| ----- | ---- | ---- | ----------- |
| IdClient | int | Sí | Id del cliente |
| Document | file | Sí | PDF |

### Respuestas esperadas

| Campo | Significado |
| ----- | ----------- |
| Éxito | Puede ser JSON (`Success`) o **PDF** según ambiente |
| Error | JSON con `Success: false` / mensaje |

Juxa Sign (`lib/digid.ts` / acciones) detecta PDF vs JSON en la respuesta.

---

## Notas para Juxa Sign

- Credenciales solo en servidor (`.env`).
- Rutas legacy inyectan `Usuario`, `Clave`, `Token`, `Modo` en el JSON; rutas `/api/ws` usan Bearer.
- **Coordenadas:** el visor de marcas oculta zoom y rotación en la barra y desactiva atajos de zoom mientras colocas firmas, para alinear `x`/`y` con `AnchoPagina`/`altoPagina` enviados a la API 8.
- **`FolioPremium` y `kyc` (API 5):** por defecto Juxa Sign envía **0/1** en `send_doc` y `add_assigned_doc` (`lib/digid.ts`). Si el sandbox exige boolean JSON, define `DIGID_FLAG_SERIALIZATION=boolean` en `.env` (ver `.env.example`).
- **`UrlDocumento`:** si la descarga requiere autenticación, `/api/proxy-pdf` y la descarga previa a `certify_doc` envían `Authorization: Bearer` con `DIGID_TOKEN` cuando está definido.

### Checklist operativo (prueba end-to-end)

1. PostgreSQL en marcha y `DATABASE_URL` en `.env`; `npx prisma db push`.
2. Variables DIGID completas (`DIGID_API_BASE`, `DIGID_LEGACY_BASE`, credenciales, `DIGID_MODO=T` en sandbox).
3. `npm install`, `npm run dev`; opcional `npm run build` antes de desplegar.
4. Flujo: empresa (1) → firmantes (2) → subir PDF (3) → marcas en visor → asignar (5) → enviar (8) → URL firmante (11). Webhook (16): túnel + `NEXT_PUBLIC_APP_URL` coherente.
