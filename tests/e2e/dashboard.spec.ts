import { expect, test } from "@playwright/test";

test("una oferta importada persiste después de recargar", async ({ page }) => {
  const suffix = Date.now();
  const title = `Growth Intern — prueba aislada ${suffix}`;
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  await page.getByRole("button", { name: "Importar" }).click();
  await page.getByPlaceholder("Empresa", { exact: true }).fill("Empresa sintética E2E");
  await page.getByPlaceholder("Cargo", { exact: true }).fill(title);
  await page.getByPlaceholder("https://enlace-original…").fill(`https://example.com/jobs/e2e-${suffix}`);
  await page.getByPlaceholder("Ubicación").fill("Santiago, Chile");
  await page.getByPlaceholder("Descripción original de la oferta").fill("Dato sintético creado en una base temporal para validar la interfaz.");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.reload();
  await expect(page.getByText(title)).toBeVisible();
});
