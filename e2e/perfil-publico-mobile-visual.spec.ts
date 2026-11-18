import { expect, test } from "@playwright/test";

// Issue #125, item 2: perfil público com foto, selos e seguidores, sem estatísticas privadas.
// Dados: demonstração das prévias (Lia Norte: artista com foto; Clara Sintonia: playlister).
const LIA = "/perfil/00000000-0000-4000-8000-000000000601";
const CLARA = "/perfil/00000000-0000-4000-8000-000000000201";

test("perfil público: foto, selos, seguidores e nada das estatísticas privadas", async ({ page }, testInfo) => {
  await page.goto(LIA);
  await expect(page.getByRole("heading", { level: 1, name: "Lia Norte" }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('img[src="/demo/artista-lia.svg"]:visible').first()).toBeVisible();
  await expect(page.locator("[data-testid=selo-artista]:visible")).toHaveText("Artista");
  await expect(page.locator("[data-testid=seguidores]:visible")).toHaveText(/^\d+ seguidor(es)?$/);
  await expect(page.getByTestId("perfil-sonoro")).toHaveCount(0);
  await expect(page.getByTestId("meta")).toHaveCount(0);
  await testInfo.attach(`${testInfo.project.name}-perfil-publico-artista`, { body: await page.screenshot(), contentType: "image/png" });

  await page.goto(CLARA);
  await expect(page.getByRole("heading", { level: 1, name: "Clara Sintonia" }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-testid=selo-playlister]:visible")).toHaveText("Playlister");
  await expect(page.locator("[data-testid=seguidores]:visible")).toHaveText(/^\d+ seguidor(es)?$/);
});
