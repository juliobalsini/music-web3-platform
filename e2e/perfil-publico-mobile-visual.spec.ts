import { expect, test } from "@playwright/test";

// Issue #125, item 2: perfil público com selos e seguidores, sem estatísticas privadas.
// Dados: demonstração das prévias (Clara Sintonia é playlister). Os artistas demo (…0101–0103) colidem com os ids dos
// curadores oficiais e abrem o perfil do curador; por isso o teste usa a playlister.
const CLARA = "/perfil/00000000-0000-4000-8000-000000000201";

test("perfil público: selo, seguidores e nada das estatísticas privadas", async ({ page }, testInfo) => {
  await page.goto(CLARA);
  await expect(page.getByRole("heading", { level: 1, name: "Clara Sintonia" }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-testid=selo-playlister]:visible")).toHaveText("Playlister");
  await expect(page.locator("[data-testid=seguidores]:visible")).toHaveText(/^\d+ seguidor(es)?$/);
  // Estatísticas privadas (aba "Você") não aparecem no perfil público.
  await expect(page.getByTestId("perfil-sonoro")).toHaveCount(0);
  await expect(page.getByTestId("meta")).toHaveCount(0);
  await testInfo.attach(`${testInfo.project.name}-perfil-publico`, { body: await page.screenshot(), contentType: "image/png" });
});
