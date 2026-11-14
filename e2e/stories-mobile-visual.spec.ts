import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Stories v2 em emulação mobile (projetos "iphone" e "android"): visualizador em tela cheia, avanço automático,
// gestos, troca de perfil, compartilhar e (fase 2) comentar. Screenshots anexadas ao relatório do Playwright.
// Dados: demonstração das prévias (perfil radioOn com 2 stories; Lia Norte com 1 story com faixa de 8 s).

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

async function abrirHome(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Stories", exact: true })).toBeVisible({ timeout: 20_000 });
}

/** Ponto dentro do palco (fração da largura e da altura). */
async function ponto(page: Page, fx: number, fy: number) {
  const b = (await page.getByTestId("story-palco").boundingBox())!;
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
}

async function deslizar(page: Page, de: [number, number], para: [number, number]) {
  const a = await ponto(page, de[0], de[1]);
  const b = await ponto(page, para[0], para[1]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}

test("Stories em tela cheia: abrir pela home, avanço automático, toque, troca de perfil e fechar", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await abrirHome(page);
  await page.getByRole("button", { name: "Ver stories de radioOn" }).click();
  const visor = page.getByRole("dialog", { name: "Stories de radioOn" });
  await page.clock.pauseAt(new Date(Date.now() + 500)); // congela já: os stories avançam sozinhos em 5 s
  await expect(visor).toBeVisible();

  // Tela cheia: o diálogo ocupa a janela inteira (cobre cabeçalho, player e navegação).
  const vp = page.viewportSize()!;
  const caixa = (await visor.boundingBox())!;
  expect(caixa.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(caixa.height).toBeGreaterThanOrEqual(vp.height - 1);
  // Sem setas visíveis nem texto de validade.
  await expect(visor.getByText(/No ar por mais/)).toHaveCount(0);
  await expect(visor.getByTestId("story-barras").locator(":scope > span")).toHaveCount(2);
  await expect(visor.getByText("Bem-vindo à rádio")).toBeVisible();
  await foto(page, "01-abrir", testInfo);

  // Avanço automático: 5 s para texto.
  await page.clock.runFor(5200);
  await expect(visor.getByText("Ouvir: é só dar play")).toBeVisible();

  // Toque no terço esquerdo volta; no direito avança.
  const esq = await ponto(page, 0.1, 0.5);
  const dir = await ponto(page, 0.9, 0.5);
  await page.touchscreen.tap(esq.x, esq.y);
  await expect(visor.getByText("Bem-vindo à rádio")).toBeVisible();
  await page.touchscreen.tap(dir.x, dir.y);
  await expect(visor.getByText("Ouvir: é só dar play")).toBeVisible();

  // Último story do perfil: toque à direita passa ao próximo perfil (com música).
  await page.touchscreen.tap(dir.x, dir.y);
  const lia = page.getByRole("dialog", { name: "Stories de Lia Norte" });
  await expect(lia).toBeVisible();
  await expect(lia.getByText("Ensaio aberto hoje à noite")).toBeVisible();
  await expect(lia.getByTestId("story-faixa")).toContainText("Madrugada no Convés");
  await foto(page, "02-faixa", testInfo);

  // Deslizar na horizontal troca de perfil (para a direita volta ao radioOn); para a esquerda, vai ao próximo.
  await deslizar(page, [0.2, 0.5], [0.8, 0.5]);
  await expect(page.getByRole("dialog", { name: "Stories de radioOn" })).toBeVisible();
  await deslizar(page, [0.8, 0.5], [0.2, 0.5]);
  await expect(page.getByRole("dialog", { name: "Stories de Lia Norte" })).toBeVisible();

  // Deslizar para baixo fecha.
  await deslizar(page, [0.5, 0.3], [0.5, 0.8]);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Já visto: o anel do círculo fica cinza.
  await expect(page.getByRole("button", { name: "Ver stories de Lia Norte" }).locator("[data-visto]").first()).toHaveAttribute("data-visto", "sim");
});

test("Stories: compartilhar em linha de ícones e comentar (visitante é convidado a entrar)", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  // Sem compartilhamento de arquivos (como em navegadores sem suporte): o Instagram cai no download do cartão.
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "canShare", { value: undefined, configurable: true }));
  await abrirHome(page);
  await page.getByRole("button", { name: "Ver stories de Lia Norte" }).click();
  await page.clock.pauseAt(new Date(Date.now() + 500)); // congela já: o story avança sozinho em 8 s
  const visor = page.getByRole("dialog", { name: "Stories de Lia Norte" });
  await expect(visor.getByText("Ensaio aberto hoje à noite")).toBeVisible();

  await visor.getByRole("button", { name: "Compartilhar" }).click();
  const painel = visor.getByRole("region", { name: "Compartilhar" });
  for (const n of ["WhatsApp", "Instagram", "Facebook", "LinkedIn", "Copiar link", "Mais"]) await expect(painel.getByLabel(n, { exact: true })).toBeVisible();
  await foto(page, "03-compartilhar", testInfo);
  await painel.getByLabel("Instagram", { exact: true }).click();
  await expect(painel.getByRole("status")).toContainText(/Cartão baixado|Não foi possível/, { timeout: 75_000 });
  await painel.getByRole("button", { name: "Fechar painel" }).click();

  // Barra inferior: campo "Comentar…" pede login para anônimos.
  await visor.getByRole("textbox", { name: "Comentar" }).fill("Hino!");
  await visor.getByRole("textbox", { name: "Comentar" }).press("Enter");
  await expect(visor.getByText("Entre com uma conta para comentar.")).toBeVisible({ timeout: 15_000 });

  // Painel de comentários: reações rápidas e figurinhas musicais próprias.
  await visor.getByRole("button", { name: "Ver comentários e reações" }).click();
  const com = visor.getByRole("region", { name: "Comentários" });
  for (const e of ["🔥", "😍", "👏", "🎶", "🎧", "😮"]) await expect(com.getByRole("button", { name: `Reagir ${e}` })).toBeVisible();
  for (const f of ["No repeat", "Que solo", "Hino", "Arrepiou"]) await expect(com.getByRole("button", { name: f, exact: true })).toBeVisible();
  await com.getByRole("button", { name: "Hino", exact: true }).click();
  await expect(com.getByText(/Entre com uma conta para comentar/)).toBeVisible({ timeout: 15_000 });
  await foto(page, "04-comentarios", testInfo);
});
