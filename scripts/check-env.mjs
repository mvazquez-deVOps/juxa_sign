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

if (!String(env.DATABASE_URL).includes("localhost") && !process.env.CI) {
  console.warn("[check:env] Aviso: DATABASE_URL no parece local; confirma que es intencional.");
}

if (!String(env.NEXT_PUBLIC_APP_URL ?? "").trim()) {
  console.warn("[check:env] Opcional: NEXT_PUBLIC_APP_URL para URLs de webhook correctas.");
}

console.log("[check:env] Variables mínimas E2E presentes (valores no mostrados).");
process.exit(0);
