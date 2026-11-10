import { expect, test, type Page } from "@playwright/test";

// Telas do redesenho mobile-first. Rodam em viewport de celular.
test.use({ viewport: { width: 390, height: 844 } });

/** A Rádio chega em streaming: os filtros só aparecem quando o conteúdo carregou. */
async function radioCarregada(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Filtros" })).toBeVisible({ timeout: 20_000 });
}

test("navegação inferior tem 3 abas e leva a cada tela", async ({ page }) => {
  await radioCarregada(page);
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link")).toHaveText(["Rádio", "Explorar", "Minha rádio"]);
  await expect(nav.getByRole("link", { name: "Rádio", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Explorar" }).click();
  await expect(page).toHaveURL(/\/explorar/);
  await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible();
  await nav.getByRole("link", { name: "Rádio", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Rádio tem os 4 filtros e eles filtram pela URL", async ({ page }) => {
  await radioCarregada(page);
  const filtros = page.getByRole("navigation", { name: "Filtros" });
  await expect(filtros.getByRole("link")).toHaveText(["Tudo", "Faixas", "Playlists", "Playlisters"]);
  await filtros.getByRole("link", { name: "Playlists" }).click();
  await expect(page).toHaveURL(/\?f=playlists/, { timeout: 20_000 });
  await expect(filtros.getByRole("link", { name: "Playlists" })).toHaveAttribute("aria-current", "page");
  await expect(filtros.getByRole("link", { name: "Playlists" })).toHaveAttribute("aria-current", "page", { timeout: 20_000 });
  await expect(page.getByRole("region", { name: "No ar" })).toHaveCount(0);
});

test("com faixas: cartão No ar, abas de lista e mini player persistente", async ({ page }) => {
  await radioCarregada(page);
  const noAr = page.getByRole("region", { name: "No ar" });
  test.skip(!(await noAr.isVisible()), "sem faixas publicadas neste ambiente");
  await expect(noAr.getByText("Ouça 30s e ganhe pontos")).toBeVisible();
  const abas = page.getByRole("navigation", { name: "Listas" });
  await expect(abas.getByRole("link")).toHaveText(["Descobertas", "Em alta", "Novidades"]);
  await expect(page.getByTestId("mini-player")).toHaveCount(0);
  await noAr.getByTestId("play").click();
  const mini = page.getByTestId("mini-player");
  await expect(mini).toBeVisible();
  // Persiste ao trocar de página e abre o player cheio ao toque.
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Explorar" }).click();
  await expect(mini).toBeVisible();
  await mini.getByRole("button", { name: /Abrir player/ }).click();
  const cheio = page.getByRole("dialog");
  await expect(cheio).toBeVisible();
  await expect(cheio.getByRole("button", { name: "Curtir" })).toBeVisible();
  await expect(cheio.getByRole("button", { name: "Salvar" })).toBeVisible();
  await expect(cheio.getByRole("button", { name: "Apoiar" })).toBeVisible();
  await expect(cheio.getByRole("button", { name: "Compartilhar" })).toBeVisible();
  await expect(cheio.getByTestId("vinil")).toBeVisible();
});

test("sem faixas: estado vazio com convite ao artista", async ({ page }) => {
  await radioCarregada(page);
  test.skip(await page.getByRole("region", { name: "No ar" }).isVisible(), "há faixas neste ambiente");
  await expect(page.getByText("Nenhuma faixa ainda")).toBeVisible();
});

test("Minha rádio exige login e Métricas/Pontos redirecionam para ela", async ({ page }) => {
  await page.goto("/minha-radio");
  await expect(page).toHaveURL(/\/login\?next=%2Fminha-radio/);
  await page.goto("/pontos");
  await expect(page).toHaveURL(/\/login\?next=%2Fminha-radio/);
  await page.goto("/metricas");
  await expect(page).toHaveURL(/\/login\?next=%2Fminha-radio/);
});

test("login e onboarding mostram a frase da marca", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Música para os melhores ouvintes.")).toBeVisible();
  await expect(page.getByRole("img", { name: "radioOn" }).first()).toBeVisible();
});

test("página de faixa inexistente dá 404 e as rotas novas de API respondem sem quebrar", async ({ page, request }) => {
  await page.goto("/faixa/not-a-uuid");
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  const capa = await request.get("/api/tracks/not-a-uuid/capa", { maxRedirects: 0 });
  expect(capa.status()).toBe(404);
  const reacao = await request.post("/api/tracks/123e4567-e89b-42d3-a456-426614174000/reacao", { data: { kind: "like", on: true } });
  expect([401, 503]).toContain(reacao.status());
  const lista = await request.get("/api/reacoes");
  expect(lista.status()).toBe(401);
});

test("ícone, manifesto e logo da marca são servidos", async ({ request }) => {
  expect((await request.get("/brand/logo.png")).status()).toBe(200);
  expect((await request.get("/icon.png")).status()).toBe(200);
  const m = await request.get("/manifest.webmanifest");
  expect(m.status()).toBe(200);
  expect((await m.json()).background_color).toBe("#00112a");
});
