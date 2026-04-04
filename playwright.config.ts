import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${e2ePort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DEMO_PASSWORD: "",
      DEMO_AUTH_SECRET: "",
      JUXA_DATA_STORE: "memory",
      PORT: e2ePort,
      /** Debe coincidir con el puerto E2E; si no, NextAuth rechaza cookies (p. ej. .env con :3000). */
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "playwright-local-auth-secret-at-least-32-characters-long",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://playwright:playwright@127.0.0.1:5432/playwright?schema=public",
    },
  },
});
