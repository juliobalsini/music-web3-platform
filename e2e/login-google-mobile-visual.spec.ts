import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

// Issue #120 (fatia 2) em emulação mobile: botão oficial do Google (GIS) com nonce, One Tap e a rota /entrar.
// O script do Google é trocado por um falso (page.route): o teste nunca fala com o Google. O cookie radioon_teste_gis
// libera o GIS fora da origem cadastrada e, só fora de produção, o servidor aceita o token "teste.google.ok" sem
// criar sessão (não chama o Supabase).

const PERFIL = "/perfil/00000000-0000-4000-8000-000000000201";

const GIS_FALSO = `
window.__gis = { prompts: 0, cancelamentos: 0 };
window.google = { accounts: { id: {
  initialize(c) { window.__gis.config = c; },
  renderButton(el) {
    el.innerHTML = "";
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Fazer login com o Google";
    b.onclick = () => window.__gis.config.callback({ credential: window.__gis.token || "teste.google.ok" });
    el.appendChild(b);
  },
  prompt() { window.__gis.prompts++; },
  cancel() { window.__gis.cancelamentos++; },
} } };
`;

async function preparar(page: Page, context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: "radioon_teste_gis", value: "1", url: baseURL }]);
  await page.route("https://accounts.google.com/gsi/client", (r) => r.fulfill({ contentType: "text/javascript", body: GIS_FALSO }));
}

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

type Gis = { prompts: number; cancelamentos: number; config?: { client_id: string; nonce: string }; token?: string };
const gis = (page: Page) => page.evaluate(() => (window as unknown as { __gis?: Gis }).__gis ?? null);

test("Google oficial: /entrar com o mesmo conteúdo do painel, nonce em hash, erro e volta ao next", async ({ page, context, baseURL }, testInfo) => {
  await preparar(page, context, baseURL!);
  await page.goto("/entrar?next=%2Fexplorar");
  await expect(page.getByRole("heading", { name: "Entre na radioOn" })).toBeVisible({ timeout: 20_000 });
  const conteudo = page.getByTestId("conteudo-login").filter({ visible: true });
  await expect(conteudo.getByText("Música independente do mundo todo. Ouça, siga artistas e envie suas faixas.")).toBeVisible();
  const google = conteudo.getByRole("button", { name: "Fazer login com o Google" });
  await expect(google).toBeVisible({ timeout: 20_000 });
  await expect(conteudo.getByText("ou", { exact: true })).toBeVisible();
  await expect(conteudo.getByRole("link", { name: "Termos" })).toBeVisible();
  const g = await gis(page);
  expect(g?.config?.client_id).toMatch(/\.apps\.googleusercontent\.com$/);
  expect(g?.config?.nonce).toMatch(/^[0-9a-f]{64}$/);
  // A tela direta não oferece One Tap (já tem o botão).
  expect(g?.prompts).toBe(0);
  await foto(page, "01-entrar", testInfo);

  // Token recusado: mensagem curta, segue na tela.
  await page.evaluate(() => ((window as unknown as { __gis: Gis }).__gis.token = "a.b.c"));
  await google.click();
  await expect(conteudo.getByRole("alert")).toContainText("Não foi possível entrar com Google");
  await foto(page, "02-erro", testInfo);

  // Token aceito: recarrega no destino pedido.
  await page.evaluate(() => ((window as unknown as { __gis: Gis }).__gis.token = "teste.google.ok"));
  await google.click();
  await page.waitForURL((u) => u.pathname === "/explorar", { timeout: 20_000, waitUntil: "commit" });
});

test("Google oficial no painel inferior: Seguir guarda a ação e volta ao perfil", async ({ page, context, baseURL }) => {
  await preparar(page, context, baseURL!);
  await page.goto(PERFIL);
  await expect(page.getByTestId("sessao-lida")).toHaveAttribute("data-conta", "0", { timeout: 20_000 });
  await page.locator("[data-testid=botao-seguir]:visible").click();
  const painel = page.getByRole("dialog", { name: "Entre na radioOn" });
  await expect(painel.getByText("Entre para seguir perfis e ver as novidades deles.")).toBeVisible();
  const pendente = await page.evaluate(() => localStorage.getItem("radioon_acao_pendente"));
  expect(JSON.parse(pendente!)).toMatchObject({ acao: "seguir:00000000-0000-4000-8000-000000000201", destino: PERFIL });
  await page.evaluate(() => ((window as unknown as { __antes?: boolean }).__antes = true));
  await painel.getByRole("button", { name: "Fazer login com o Google" }).click();
  // Durante a navegação o evaluate falha: conta como "ainda não recarregou".
  await expect.poll(() => page.evaluate(() => (window as unknown as { __antes?: boolean }).__antes ?? false).catch(() => true), { timeout: 20_000 }).toBe(false);
  expect(new URL(page.url()).pathname).toBe(PERFIL);

  // Fechar o painel sem entrar desiste da ação.
  await page.locator("[data-testid=botao-seguir]:visible").click();
  await expect(painel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(painel).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("radioon_acao_pendente"))).toBeNull();
});

test("One Tap: aparece uma vez por sessão para visitante e some quando uma tela abre por cima", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  await preparar(page, context, baseURL!);
  await page.goto("/explorar");
  await expect(page.getByTestId("sessao-lida")).toHaveAttribute("data-conta", "0", { timeout: 20_000 });
  await expect.poll(async () => (await gis(page))?.prompts ?? 0, { timeout: 15_000 }).toBe(1);
  expect((await gis(page))?.config?.nonce).toMatch(/^[0-9a-f]{64}$/);
  await foto(page, "03-one-tap", testInfo);

  // Menu (camada modal) por cima: o One Tap é cancelado.
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect.poll(async () => (await gis(page))?.cancelamentos ?? 0).toBeGreaterThan(0);

  // Mesma sessão: não aparece de novo.
  await page.reload();
  await expect(page.getByTestId("sessao-lida")).toHaveAttribute("data-conta", "0", { timeout: 20_000 });
  await page.waitForTimeout(4_000);
  expect((await gis(page))?.prompts ?? 0).toBe(0);
});
