#!/usr/bin/env node
/**
 * Verifica variables requeridas para desarrollo / E2E (no imprime secretos).
 * Carga .env desde la raíz del proyecto si existe.
 */
import fs from "fs";
import { fileURLToPath } from "url";
import pathMod from "path";

const __dirname = pathMod.dirname(fileURLToPath(import.meta.url));
const root = pathMod.join(__dirname, "..");
const envPath = pathMod.join(root, ".env");

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileVars = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};
const env = { ...fileVars, ...process.env };

const deployCheck = String(process.env.DEPLOY_CHECK ?? "").trim().toLowerCase();
const production =
  process.argv.includes("--production") || deployCheck === "1" || deployCheck === "pending";
/** Sin URL pública aún: no falla por NEXT_PUBLIC_APP_URL ni por webhook secret (solo avisos). */
const pendingUrl = process.argv.includes("--pending-url") || deployCheck === "pending";

const requiredE2E = [
  "DATABASE_URL",
  "DIGID_API_BASE",
  "DIGID_LEGACY_BASE",
  "DIGID_USUARIO",
  "DIGID_CLAVE",
  "DIGID_TOKEN",
  "DIGID_MODO",
];

const missing = requiredE2E.filter((k) => !String(env[k] ?? "").trim());
if (missing.length) {
  console.error("[check:env] Faltan variables obligatorias para E2E con DIGID:");
  missing.forEach((k) => console.error(`  - ${k}`));
  console.error(`\nCopia .env.example a .env y complétalas. Archivo buscado: ${envPath}`);
  process.exit(1);
}

const demoPw = String(env.DEMO_PASSWORD ?? "").trim();
const memoryStore = String(env.JUXA_DATA_STORE ?? "").trim().toLowerCase() === "memory";
if (demoPw) {
  const needOrg = !memoryStore;
  const miss = [];
  if (!String(env.DEMO_AUTH_SECRET ?? "").trim()) miss.push("DEMO_AUTH_SECRET");
  if (needOrg && !String(env.DEMO_ORGANIZATION_ID ?? "").trim()) miss.push("DEMO_ORGANIZATION_ID");
  if (miss.length) {
    console.error("[check:env] Modo demo (DEMO_PASSWORD): faltan variables:");
    miss.forEach((k) => console.error(`  - ${k}`));
    if (memoryStore) {
      console.error("(Con JUXA_DATA_STORE=memory, DEMO_ORGANIZATION_ID es opcional si el código aporta org.)");
    }
    process.exit(1);
  }
} else if (!process.env.CI && !String(env.AUTH_SECRET ?? "").trim()) {
  console.warn(
    "[check:env] Sin DEMO_PASSWORD: NextAuth necesita AUTH_SECRET en .env (openssl rand -base64 32).",
  );
}

if (!String(env.DATABASE_URL).includes("localhost") && !process.env.CI) {
  console.warn("[check:env] Aviso: DATABASE_URL no parece local; confirma que es intencional.");
}

const pubUrl = String(env.NEXT_PUBLIC_APP_URL ?? "").trim();
if (!pubUrl) {
  console.warn("[check:env] Opcional: NEXT_PUBLIC_APP_URL para URLs de webhook correctas.");
}

if (production) {
  const fail = (msg) => {
    console.error(msg);
    process.exit(1);
  };
  const warn = (msg) => console.warn(msg);

  if (!pubUrl) {
    if (pendingUrl) {
      warn(
        "[check:env] Sin URL pública aún: NEXT_PUBLIC_APP_URL vacía. Cuando tengas dominio, configúrala y vuelve a ejecutar check:env:production (sin --pending-url).",
      );
    } else {
      fail("[check:env] Producción: NEXT_PUBLIC_APP_URL es obligatoria (URL pública HTTPS).");
    }
  } else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(pubUrl)) {
    if (pendingUrl) {
      warn(
        "[check:env] NEXT_PUBLIC_APP_URL sigue siendo localhost; es válido para desarrollo. Antes del corte final usa el dominio real.",
      );
    } else {
      fail(
        "[check:env] Producción: NEXT_PUBLIC_APP_URL no puede ser localhost; usa el dominio público del despliegue.",
      );
    }
  }
  if (pubUrl && !/^https:\/\//i.test(pubUrl)) {
    warn("[check:env] Producción: se recomienda HTTPS en NEXT_PUBLIC_APP_URL.");
  }
  if (!String(env.DIGID_WEBHOOK_SECRET ?? "").trim()) {
    if (pendingUrl) {
      warn(
        "[check:env] DIGID_WEBHOOK_SECRET sin definir: el webhook aceptará cualquier POST si no añades secreto en código. Define un secreto antes de exponer la URL a DIGID.",
      );
    } else {
      fail(
        "[check:env] Producción: define DIGID_WEBHOOK_SECRET para validar POST /api/webhooks/digid.",
      );
    }
  }

  if (!demoPw && !String(env.AUTH_SECRET ?? "").trim()) {
    if (pendingUrl) {
      warn(
        "[check:env] Sin DEMO_PASSWORD: antes del go-live define AUTH_SECRET para NextAuth (openssl rand -base64 32).",
      );
    } else {
      fail(
        "[check:env] Producción sin DEMO_PASSWORD: AUTH_SECRET es obligatoria para NextAuth. Alternativa: modo demo con DEMO_PASSWORD + DEMO_AUTH_SECRET (+ DEMO_ORGANIZATION_ID si no usas JUXA_DATA_STORE=memory).",
      );
    }
  }

  const devHost = /dev\.digidmexico\.com\.mx/i;
  if (devHost.test(String(env.DIGID_API_BASE ?? "")) || devHost.test(String(env.DIGID_LEGACY_BASE ?? ""))) {
    warn(
      "[check:env] Aviso: URLs DIGID apuntan a sandbox (dev). Confirma que este despliegue es solo de prueba.",
    );
  }
  console.log(
    pendingUrl
      ? "[check:env] Modo producción (URL pendiente): variables base OK; revisa avisos arriba."
      : "[check:env] Modo producción: comprobaciones extra OK (valores no mostrados).",
  );
} else {
  console.log("[check:env] Variables mínimas E2E presentes (valores no mostrados).");
}
process.exit(0);
