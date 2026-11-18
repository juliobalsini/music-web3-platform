import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Issue #206: botão "Instalar a radioOn" (PWA) em emulação mobile (projetos "iphone" e "android").
// Android/Chrome: o evento beforeinstallprompt é simulado (a emulação não instala de verdade) e o toque chama prompt().
// iPhone: painel com 3 passos. Navegador interno (Instagram): "Abra no navegador" + copiar link. Instalado: nada aparece.

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

async function semGraves(page: Page, escopo: string) {
  const { violations } = await new AxeBuilder({ page }).include(escopo).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
}

/** Espera o cabeçalho sair do fallback do Suspense (por um instante há dois botões ☰) e abre o menu. */
async function abrirMenu(page: Page) {
  await expect(page.getByTestId("menu-abrir")).toHaveCount(1, { timeout: 20_000 });
  await page.getByTestId("menu-abrir").click();
}

async function abrirGaveta(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("visao-tudo")).toBeVisible({ timeout: 20_000 });
  await abrirMenu(page);
  await expect(page.getByTestId("gaveta")).toBeVisible();
}

test("gaveta: Instalar a radioOn abre a instalação nativa (Android) ou os 3 passos (iPhone)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await abrirGaveta(page);
  const item = page.getByTestId("instalar-gaveta");
  await expect(item).toHaveText("Instalar a radioOn");

  if (testInfo.project.name === "android") {
    // A gaveta abriu: o app hidratou e a captura está ligada. Simula o evento do Chrome.
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(e, {
        prompt: () => {
          (window as unknown as { promptChamado: boolean }).promptChamado = true;
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(e);
    });
    await foto(page, "instalar-01-gaveta", testInfo);
    await item.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { promptChamado?: boolean }).promptChamado === true)).toBe(true);
    await expect(page.getByRole("dialog", { name: "Instalar a radioOn" })).toHaveCount(0);
    // Recusou: o evento não vale de novo; o item segue e passa a mostrar os passos do menu ⋮.
    await item.click();
    await expect(page.getByRole("dialog", { name: "Instalar a radioOn" }).getByTestId("instalar-passos")).toBeVisible();
    await foto(page, "instalar-02-passos-android", testInfo);
    return;
  }

  await foto(page, "instalar-01-gaveta", testInfo);
  await item.click();
  const painel = page.getByRole("dialog", { name: "Instalar a radioOn" });
  const passos = painel.getByTestId("instalar-passos").getByRole("listitem");
  await expect(passos).toHaveCount(3);
  await expect(passos.nth(0)).toContainText("Compartilhar");
  await expect(passos.nth(1)).toContainText("Adicionar à Tela de Início");
  await expect(passos.nth(2)).toContainText("Adicionar");
  await foto(page, "instalar-02-passos-iphone", testInfo);
  await semGraves(page, "dialog[open]");
  await page.keyboard.press("Escape");
  await expect(painel).toHaveCount(0);
});

test.describe("navegador interno (Instagram)", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0",
  });

  test("pede para abrir no navegador e copia o link", async ({ page, context }, testInfo) => {
    test.setTimeout(90_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await abrirGaveta(page);
    await page.getByTestId("instalar-gaveta").click();
    const painel = page.getByRole("dialog", { name: "Instalar a radioOn" });
    await expect(painel.getByTestId("instalar-interno")).toContainText("Abra no navegador para instalar");
    await expect(painel.getByRole("textbox", { name: "Link" })).toHaveValue(/\/$/);
    await painel.getByRole("button", { name: "Copiar link" }).click();
    await expect(painel.getByRole("status")).not.toBeEmpty();
    await foto(page, "instalar-03-interno", testInfo);
    await semGraves(page, "dialog[open]");
  });
});

test("app já instalado (standalone): nada de instalar", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes("display-mode: standalone") ? ({ ...original(q), matches: true, media: q, addEventListener() {}, removeEventListener() {} } as MediaQueryList) : original(q));
  });
  await abrirGaveta(page);
  await expect(page.getByTestId("gaveta").getByRole("link", { name: "Privacidade" })).toBeVisible();
  await expect(page.getByTestId("instalar-gaveta")).toHaveCount(0);
  await expect(page.getByTestId("instalar-aviso")).toHaveCount(0);
});

test("Home: aviso só a partir da 2ª visita; fechado, não volta", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByTestId("visao-tudo")).toBeVisible({ timeout: 20_000 });
  await abrirMenu(page); // garante a hidratação
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("instalar-aviso")).toHaveCount(0); // 1ª visita

  // 2ª visita: nova sessão (o contador soma uma vez por sessão do navegador).
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  const aviso = page.getByTestId("instalar-aviso");
  await expect(aviso).toBeVisible({ timeout: 20_000 });
  // No centro da tela: na borda de baixo a navegação fixa (e a barra da Vercel na prévia) ficam por cima.
  await aviso.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(aviso.getByRole("button", { name: "Instalar", exact: true })).toBeVisible();
  await foto(page, "instalar-04-aviso-home", testInfo);
  await semGraves(page, "[data-testid=instalar-aviso]");

  await aviso.getByRole("button", { name: "Fechar aviso de instalação" }).click();
  await expect(aviso).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByTestId("visao-tudo")).toBeVisible({ timeout: 20_000 });
  await abrirMenu(page);
  await expect(page.getByTestId("instalar-aviso")).toHaveCount(0);
});
