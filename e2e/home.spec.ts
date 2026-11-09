import { expect, test } from "@playwright/test";

test("home carrega com a identidade visual do radioOn", async ({ page }) => {
  const resposta = await page.goto("/");
  expect(resposta?.status()).toBe(200);
  await expect(page).toHaveTitle("radioOn");

  // Fundo em gradiente #0f0f23 → #16213e.
  const fundo = await page.evaluate(
    () => getComputedStyle(document.body).backgroundImage,
  );
  expect(fundo).toContain("rgb(15, 15, 35)");
  expect(fundo).toContain("rgb(22, 33, 62)");

  // Logo: "radio" branco + "On" laranja.
  const radio = page.getByText("radio", { exact: true });
  const on = page.getByText("On", { exact: true });
  await expect(radio).toBeVisible();
  await expect(on).toBeVisible();
  await expect(radio).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(on).toHaveCSS("color", "rgb(255, 107, 53)");

  // Play em destaque: botão (com faixas) ou marca inerte (sem faixas).
  await expect(page.locator("[data-testid=play]:visible, [data-testid=play-vazio]:visible").first()).toBeVisible();
});

test("cabeçalho deslogado tem Entrar e leva ao login", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Enviar música" })).toHaveCount(0);
  await nav.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login/);
  // Fora da home, o logo pequeno volta ao início.
  await page.getByRole("link", { name: "radioOn, início" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("estado vazio: play inerte e convite ao artista (quando não há faixas)", async ({ page }) => {
  await page.goto("/");
  const vazio = page.locator("[data-testid=play-vazio]:visible");
  test.skip(!(await vazio.first().isVisible()), "há faixas publicadas neste ambiente");
  await expect(page.getByRole("button")).toHaveCount(0);
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
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?erro=1/);
});

test("playlist inexistente dá 404 e /curador exige login", async ({ page }) => {
  await page.goto("/playlist/not-a-uuid");
  // Página em streaming: o status já saiu 200; o 404 aparece no conteúdo.
  await expect(page.getByText(/could not be found|404/i).first()).toBeVisible();
  await page.goto("/curador");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/enviar");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/metricas");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/pontos");
  await expect(page).toHaveURL(/\/login/);
});
