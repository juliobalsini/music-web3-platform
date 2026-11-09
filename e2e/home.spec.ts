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

  // Botão de play em destaque.
  await expect(page.getByTestId("play")).toBeVisible();
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
});
