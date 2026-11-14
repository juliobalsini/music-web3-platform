import { expect, test } from "@playwright/test";

test("home carrega com a identidade visual do radioOn", async ({ page }) => {
  const resposta = await page.goto("/");
  expect(resposta?.status()).toBe(200);
  await expect(page).toHaveTitle("radioOn");

  // Fundo marinho #00112a e logo do gramofone.
  const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fundo).toBe("rgb(0, 17, 42)");
  await expect(page.getByRole("img", { name: "radioOn" }).first()).toBeVisible();

  // Play em destaque: botão (com faixas) ou marca inerte (sem faixas).
  await expect(page.getByRole("region", { name: "Stories" })).toBeVisible({ timeout: 20_000 }); // conteúdo em streaming
  await expect(page.locator("[data-testid=play]:visible, [data-testid=play-vazio]:visible").first()).toBeVisible();
});

test("topo só tem logo e menu; a gaveta do visitante leva ao login", async ({ page }) => {
  await page.goto("/");
  const topo = page.getByRole("banner");
  await expect(topo.getByRole("link", { name: "Entrar" })).toHaveCount(0);
  await expect(topo.getByTestId("selo-no-ar")).toHaveCount(0);
  await topo.getByRole("button", { name: "Abrir menu" }).click();
  const gaveta = page.getByRole("dialog", { name: "Menu" });
  await expect(gaveta.getByRole("region", { name: "Crie sua conta" })).toBeVisible();
  await expect(gaveta.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  await expect(gaveta.getByRole("link", { name: "Enviar música" })).toHaveCount(0);
  await gaveta.getByRole("link", { name: "Entrar com link por e-mail" }).click();
  await expect(page).toHaveURL(/\/login/);
  // O logo do cabeçalho volta ao início.
  await page.getByRole("link", { name: "radioOn, início" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("estado vazio: play inerte e convite ao artista (catálogo sem faixas)", async ({ page, baseURL }) => {
  // Cookie de teste: desliga o catálogo de demonstração (só tem efeito fora de produção).
  await page.context().addCookies([{ name: "radioon_sem_demo", value: "1", url: baseURL! }]);
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Stories" })).toBeVisible({ timeout: 20_000 }); // conteúdo em streaming
  const vazio = page.locator("[data-testid=play-vazio]:visible");
  // Se o banco da prévia já tiver faixas reais, o estado vazio não existe: vale a Rádio com faixas.
  if (!(await vazio.first().isVisible())) {
    await expect(page.getByRole("region", { name: "No ar" })).toBeVisible();
    return;
  }
  // Sem faixa não há play: só o story fixo da plataforma é botão.
  await expect(page.getByTestId("play")).toHaveCount(0);
  await expect(vazio).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByText("Nenhuma faixa ainda")).toBeVisible();
  await page.getByRole("link", { name: "Enviar primeira faixa" }).click();
  // Deslogado, /enviar leva ao login.
  await expect(page).toHaveURL(/\/login/);
});

test("GET /api/health responde ok com o commit", async ({ request }) => {
  const resposta = await request.get("/api/health");
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("application/json");
  const corpo = await resposta.json();
  expect(corpo.ok).toBe(true);
  expect("commit" in corpo).toBe(true);
  if (process.env.E2E_BASE_URL) expect(typeof corpo.commit).toBe("string");
});

test("rotas de faixa sem armazenamento/sessão não quebram", async ({ request }) => {
  const play = await request.get("/api/tracks/not-a-uuid/play");
  expect(play.status()).toBe(404);
  const up = await request.post("/api/tracks/upload", { data: {} });
  expect([401, 503]).toContain(up.status());
});

test("página de login carrega e callback inválido volta ao login", async ({ page }) => {
  const r = await page.goto("/login");
  expect(r?.status()).toBe(200);
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByText("Música para os melhores ouvintes.")).toBeVisible();
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?erro=1/);
});

test("playlist inexistente dá 404 e /curador exige login", async ({ page }) => {
  await page.goto("/playlist/not-a-uuid");
  // Página em streaming: o status já saiu 200; o 404 aparece no conteúdo.
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await page.goto("/curador");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/enviar");
  // O login lembra o destino pedido.
  await expect(page).toHaveURL(/\/login\?next=%2Fenviar/);
  // Perfil de visitante não redireciona: mostra o convite com Entrar com Google.
  await page.goto("/minha-radio");
  await expect(page.getByRole("region", { name: "Entre na radioOn" })).toBeVisible({ timeout: 20_000 });
});

test("páginas legais são públicas, com contato; links na gaveta e no login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Privacidade" }).click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: "juliobalsini@gmail.com" }).first()).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Termos" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();
});
