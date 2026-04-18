import { test, expect } from "@playwright/test";

/**
 * Memoria: ADMIN demo@juxa.local / demo1234 y USER operador@juxa.local / operador1234
 * (lib/memory-panel-credentials.ts). Requiere JUXA_DATA_STORE=memory y sin DEMO_PASSWORD.
 */
test.describe("autenticación", () => {
  test("login admin y acceso a ruta protegida", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /bienvenido/i })).toBeVisible();
    await expect(page.getByLabel("Correo")).toBeVisible();

    await page.getByLabel("Correo").fill("demo@juxa.local");
    await page.getByLabel("Contraseña").fill("demo1234");
    await page.getByRole("button", { name: "Acceder" }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.goto("/documentos");
    await expect(page.getByRole("heading", { name: "Documentos", exact: true })).toBeVisible();
  });

  test("login usuario operativo (USER) accede al panel", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill("operador@juxa.local");
    await page.getByLabel("Contraseña").fill("operador1234");
    await page.getByRole("button", { name: "Acceder" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/documentos");
    await expect(page.getByRole("heading", { name: "Documentos", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByText(/Rol:\s*Usuario/)).toBeVisible();
  });

  test("sin sesión, documentos redirige a login", async ({ page }) => {
    await page.goto("/documentos");
    await expect(page).toHaveURL(/\/login/);
  });
});
