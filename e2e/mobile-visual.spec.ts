import { expect, test, type Page } from "@playwright/test";

// Fase C: teste visual em emulação mobile (projetos "iphone" e "android" do playwright.config.ts).
// Gera screenshots das telas públicas e anexa ao relatório HTML do Playwright (artefato da execução do gate).
// Telas que exigem login (enviar, perfil logado) são capturadas pelo redirecionamento ao login.
// Sem asserções de pixel: só confirma que a tela abriu e não estourou na horizontal.

async function foto(page: Page, nome: string, testInfo: import("@playwright/test").TestInfo) {
  const larg = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(larg.sw, `${nome}: rolagem horizontal`).toBeLessThanOrEqual(larg.cw + 1);
  const png = await page.screenshot({ fullPage: false });
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: png, contentType: "image/png" });
}

async function home(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Stories" })).toBeVisible({ timeout: 20_000 });
}

test("telas principais em celular", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await home(page);
  await foto(page, "home", testInfo);

  // Rádio: cada filtro.
  const filtros = page.getByRole("navigation", { name: "Filtros" });
  for (const nome of ["Faixas", "Álbuns", "Playlists", "Stories"]) {
    await filtros.getByRole("button", { name: nome }).evaluate((el: HTMLElement) => el.click()); // chips rolam na horizontal: "estável" do Playwright não se aplica
    await page.waitForTimeout(300);
    await foto(page, `filtro-${nome.toLowerCase().replace("á", "a")}`, testInfo);
  }

  // Stories.
  await filtros.getByRole("button", { name: "Tudo" }).evaluate((el: HTMLElement) => el.click());
  await page.getByRole("button", { name: "Ver stories de radioOn" }).click();
  await expect(page.getByRole("dialog", { name: /Stories de radioOn/ })).toBeVisible();
  await foto(page, "stories", testInfo);
  await page.keyboard.press("Escape");

  // Mini player + player cheio (só se houver faixa tocável; a prévia pode estar sem catálogo).
  const play = page.locator("[data-testid=play]:visible").first();
  if (await play.count()) {
    await play.click();
    await page.waitForTimeout(800);
    await foto(page, "mini-player", testInfo);
    const abrir = page.getByRole("button", { name: /abrir player|player cheio|expandir/i }).first();
    if (await abrir.count()) {
      await abrir.click();
      await page.waitForTimeout(400);
      await foto(page, "player-cheio", testInfo);
    }
  }

  // Explorar, Perfil e Enviar (os dois últimos levam ao login quando deslogado).
  for (const [caminho, nome] of [["/explorar", "explorar"], ["/minha-radio", "perfil"], ["/enviar", "enviar"]] as const) {
    await page.goto(caminho);
    await page.waitForLoadState("domcontentloaded");
    await foto(page, nome, testInfo);
  }
});
