#!/usr/bin/env node
/**
 * Arranca `next dev` en el primer puerto TCP libre en 127.0.0.1 (evita choques con 3333/3000).
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const p = typeof addr === "object" && addr ? addr.port : 0;
      s.close((err) => (err ? reject(err) : resolve(p)));
    });
    s.on("error", reject);
  });
}

const port = await pickFreePort();
if (!port) {
  console.error("No se pudo obtener un puerto libre.");
  process.exit(1);
}

console.error(`\n  ▶ Next.js (Turbopack) en http://127.0.0.1:${port}\n`);

const child = spawn(process.execPath, [nextBin, "dev", "--turbopack", "-p", String(port)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
