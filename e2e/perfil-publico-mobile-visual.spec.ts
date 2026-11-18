import { expect, test } from "@playwright/test";

// Issue #125, item 2: perfil público com foto, selos e seguidores, sem estatísticas privadas.
// Dados: demonstração das prévias (Lia Norte tem foto e faixas publicadas).
const LIA = "/perfil/00000000-0000-4000-8000-000000000101";

test("perfil público: foto, selo Artista, seguidores e nada das estatísticas privadas", async ({ page }, testInfo) => {
  await page.goto(LIA);
  await expect(page.getByRole("heading", { level: 1, name: "Lia Norte" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('img[src="/demo/artista-lia.svg"]').first()).toBeVisible();
  await expect(page.getByTestId("selo-artista")).toHaveText("Artista");
  await expect(page.getByTestId("seguidores")).toHaveText(/\d+ seguidor(es)?/);
  await expect(page.getByRole("region", { name: "Faixas do artista" })).toBeVisible();
  // Estatísticas privadas (aba "Você") não aparecem no perfil público.
  await expect(page.getByTestId("perfil-sonoro")).toHaveCount(0);
  await expect(page.getByTestId("meta")).toHaveCount(0);
  await testInfo.attach(`${testInfo.project.name}-perfil-publico`, { body: await page.screenshot(), contentType: "image/png" });
});
