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

const DEMO = /Madrugada no Convés|Faróis|Ondas curtas|Vitrola azul|Porto sem pressa|Sinal âmbar|Maré de domingo|Fio de prata/;

// Fora de produção a Rádio tem o catálogo de demonstração (lib/radio/demo.ts, áudio local): estes
// testes nunca são pulados e exercitam lista, play, mini player e player cheio.
test("Rádio cheia: cartão No ar, grade, abas, playlisters e playlists", async ({ page }) => {
  await radioCarregada(page);
  const noAr = page.getByRole("region", { name: "No ar" });
  await expect(noAr).toBeVisible();
  await expect(noAr.getByText("Ouça 30s e ganhe pontos")).toBeVisible();
  await expect(page.getByRole("region", { name: "Para começar" })).toBeVisible();
  const abas = page.getByRole("navigation", { name: "Listas" });
  await expect(abas.getByRole("link")).toHaveText(["Descobertas", "Em alta", "Novidades"]);
  await expect(page.getByRole("list", { name: "Descobertas" }).getByRole("button").first()).toBeVisible();
  await abas.getByRole("link", { name: "Em alta" }).click();
  await expect(page.getByRole("list", { name: "Em alta" }).getByRole("button").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Playlisters em alta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playlists da semana" })).toBeVisible();
});

test("Ouvir agora toca, mini player persiste e abre o player cheio", async ({ page }) => {
  await radioCarregada(page);
  const noAr = page.getByRole("region", { name: "No ar" });
  await expect(page.getByTestId("mini-player")).toHaveCount(0);
  await noAr.getByTestId("play").click();
  const mini = page.getByTestId("mini-player");
  await expect(mini).toBeVisible();
  await expect(mini.getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  // Persiste ao trocar de página e abre o player cheio ao toque.
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Explorar" }).click();
  await expect(mini).toBeVisible();
  await mini.getByRole("button", { name: /Abrir player/ }).click();
  const cheio = page.getByRole("dialog");
  await expect(cheio).toBeVisible();
  for (const n of ["Curtir", "Salvar", "Apoiar", "Compartilhar"]) await expect(cheio.getByRole("button", { name: n })).toBeVisible();
  await expect(cheio.getByTestId("vinil")).toBeVisible();
});

test("toda faixa publicada aparece no Explorar e toca de lá", async ({ page }) => {
  await page.goto("/explorar");
  const lista = page.getByRole("list", { name: "Todas as faixas" });
  await expect(lista.getByRole("button").first()).toBeVisible({ timeout: 20_000 });
  expect(await lista.getByRole("button").count()).toBeGreaterThanOrEqual(8);
  // A prévia pode ter faixas reais (sem B2 não tocam): o play é conferido numa faixa de demonstração.
  await lista.getByRole("button", { name: DEMO }).first().click();
  const mini = page.getByTestId("mini-player");
  await expect(mini.getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
});

test("toca da grade 'Para começar' e de uma aba de lista", async ({ page }) => {
  await radioCarregada(page);
  await page.getByRole("region", { name: "Para começar" }).getByRole("button", { name: DEMO }).first().click();
  const mini = page.getByTestId("mini-player");
  await expect(mini.getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("list", { name: "Descobertas" }).getByRole("button", { name: DEMO }).first().click();
  await expect(mini.getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
});

test("PWA: manifesto com share target de áudio e service worker", async ({ request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.display).toBe("standalone");
  expect(m.share_target.action).toBe("/compartilhar");
  expect(m.share_target.params.files[0].accept).toContain(".m4a");
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).toContain("/compartilhar");
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
  const capa = await request.get("/api/tracks/not-a-uuid/capa");
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

test("busca no Explorar filtra por título e avisa quando não acha", async ({ page }) => {
  await page.goto("/explorar?q=zzzxyz");
  await expect(page.getByRole("search")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Nada encontrado|Ainda não|vazio/i).first()).toBeVisible({ timeout: 20_000 });
});

test("perfil público: id inválido ou desconhecido dá 404", async ({ page }) => {
  await page.goto("/perfil/not-a-uuid");
  await expect(page.getByText("Página não encontrada")).toBeVisible({ timeout: 20_000 });
  await page.goto("/perfil/00000000-0000-4000-8000-00000000ffff");
  await expect(page.getByText("Página não encontrada")).toBeVisible({ timeout: 20_000 });
});

test("Playlisters em alta levam ao perfil público", async ({ page }) => {
  await radioCarregada(page);
  const link = page.getByRole("region", { name: "Playlisters em alta" }).getByRole("link").first();
  await link.click();
  await expect(page).toHaveURL(/\/perfil\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Playlists" })).toBeVisible();
});
