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
  await expect(nav.getByRole("link")).toHaveText(["Rádio", "Explorar", "Perfil"]);
  await expect(nav.getByRole("link", { name: "Rádio", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Explorar" }).click();
  await expect(page).toHaveURL(/\/explorar/);
  await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible();
  await nav.getByRole("link", { name: "Rádio", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Rádio tem os filtros e eles trocam sem ida ao servidor", async ({ page }) => {
  await radioCarregada(page);
  const filtros = page.getByRole("navigation", { name: "Filtros" });
  // Álbuns e Stories só aparecem quando há conteúdo (a demonstração tem um EP, mas ainda não há stories).
  await expect(filtros.getByRole("button")).toHaveText(["Tudo", "Faixas", "Álbuns", "Playlists"]);
  let navegou = false;
  page.on("request", (r) => {
    if (r.isNavigationRequest()) navegou = true;
  });
  await filtros.getByRole("button", { name: "Playlists" }).click();
  await expect(filtros.getByRole("button", { name: "Playlists" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "No ar" })).toHaveCount(0);
  await expect(page).toHaveURL(/\?f=playlists/);
  expect(navegou).toBe(false);
});

const DEMO = /Madrugada no Convés|Faróis|Ondas curtas|Vitrola azul|Porto sem pressa|Sinal âmbar|Maré de domingo|Fio de prata/;

// Fora de produção a Rádio tem o catálogo de demonstração (lib/radio/demo.ts, áudio local): estes
// testes nunca são pulados e exercitam lista, play, mini player e player cheio.
test("Rádio cheia: cartão No ar, grade, abas, playlisters e playlists", async ({ page }) => {
  await radioCarregada(page);
  const noAr = page.getByRole("region", { name: "No ar" });
  await expect(noAr).toBeVisible();
  await expect(noAr.getByText("Ouça 30s e ganhe pontos")).toBeVisible();
  await expect(page.getByTestId("selo-no-ar")).toContainText("No ar");
  // Sem histórico, "Continue ouvindo" fica oculto; Playlisters saiu da Rádio.
  await expect(page.getByRole("region", { name: "Continue ouvindo" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Playlisters em alta" })).toHaveCount(0);
  const abas = page.getByRole("tablist", { name: "Listas" });
  await expect(abas.getByRole("tab")).toHaveText(["Descobertas", "Em alta", "Novidades"]);
  // Abas nunca vazias: sem curadoria, Descobertas mostra as menos ouvidas.
  await expect(page.getByRole("list", { name: "Descobertas" }).getByRole("button").first()).toBeVisible();
  await abas.getByRole("tab", { name: "Em alta" }).click();
  await expect(page.getByRole("list", { name: "Em alta" }).getByRole("button").first()).toBeVisible();
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

test("toca do cartão No ar e de uma aba de lista", async ({ page }) => {
  await radioCarregada(page);
  await page.getByRole("region", { name: "No ar" }).getByTestId("play").click();
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

test("Perfil de visitante mostra o convite; Métricas/Pontos levam a ele", async ({ page }) => {
  await page.goto("/minha-radio");
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible({ timeout: 20_000 });
  const convite = page.getByRole("region", { name: "Entre no radioOn" });
  await expect(convite.getByText("Salvar seus pontos")).toBeVisible();
  await expect(convite.getByText("Criar playlists")).toBeVisible();
  await expect(convite.getByText("Enviar música")).toBeVisible();
  await expect(convite.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await page.goto("/pontos");
  await expect(page).toHaveURL(/\/minha-radio/);
  await page.goto("/metricas");
  await expect(page).toHaveURL(/\/minha-radio/);
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

test("Playlisters em alta (no Explorar) levam ao perfil público", async ({ page }) => {
  await page.goto("/explorar");
  const link = page.getByRole("region", { name: "Playlisters em alta" }).getByRole("link").first();
  await link.click();
  await expect(page).toHaveURL(/\/perfil\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Playlists" })).toBeVisible();
});

// Faixa de demonstração (fora de produção): pré-visualização para WhatsApp e redes.
const FAIXA_DEMO = "00000000-0000-4000-8000-000000000001";

test("compartilhar: página da faixa tem Open Graph e a imagem 1200x630 é gerada", async ({ page, request }) => {
  await page.goto(`/faixa/${FAIXA_DEMO}`);
  const og = page.locator('meta[property="og:image"]');
  await expect(og).toHaveAttribute("content", new RegExp(`/api/tracks/${FAIXA_DEMO}/og$`));
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Madrugada no Convés · Lia Norte/);
  const img = await request.get(`/api/tracks/${FAIXA_DEMO}/og`);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
  expect((await img.body()).length).toBeGreaterThan(5_000);
  expect((await request.get("/api/tracks/00000000-0000-4000-8000-0000000000ff/og")).status()).toBe(404);
  expect((await request.get("/api/tracks/not-a-uuid/og")).status()).toBe(404);
});

test("capas geradas são distintas entre faixas", async ({ page }) => {
  await page.goto("/explorar");
  const lista = page.getByRole("list", { name: "Todas as faixas" });
  await expect(lista.getByRole("button").first()).toBeVisible({ timeout: 20_000 });
  const sig = await lista.locator('[data-testid="capa-gerada"]').evaluateAll((els) =>
    els.map((e) => `${e.getAttribute("data-glifo")}|${e.getAttribute("data-textura")}|${e.innerHTML.match(/stop-color="([^"]+)"/)?.[1]}`),
  );
  expect(new Set(sig).size).toBeGreaterThanOrEqual(5);
});

test("Explorar: recomendações, carrosséis, artistas, gêneros e climas navegáveis", async ({ page }) => {
  await page.goto("/explorar");
  for (const n of ["Para você", "Descobertas", "Em alta", "Novidades", "Artistas", "Gêneros", "Climas"]) {
    await expect(page.getByRole("region", { name: n, exact: true })).toBeVisible({ timeout: 20_000 });
  }
  // Recomendação toca com um toque.
  await page.getByRole("region", { name: "Para você", exact: true }).getByRole("button").first().click();
  await expect(page.getByTestId("mini-player").getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  // Gênero vira uma lista de faixas.
  await page.getByRole("region", { name: "Gêneros", exact: true }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/explorar\?genero=/);
  await expect(page.getByRole("heading", { name: /^Gênero:/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("list", { name: /^Faixas de/ }).getByRole("button").first()).toBeVisible();
  await page.goto("/explorar");
  await page.getByRole("region", { name: "Climas", exact: true }).getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: /^Clima:/ })).toBeVisible({ timeout: 20_000 });
});

test("Álbuns: filtro na Rádio, página do álbum e tocar álbum", async ({ page }) => {
  await radioCarregada(page);
  await page.getByRole("navigation", { name: "Filtros" }).getByRole("button", { name: "Álbuns" }).click();
  const link = page.getByRole("region", { name: "Álbuns e EPs" }).getByRole("link", { name: /Sinais/ });
  await link.click();
  await expect(page).toHaveURL(/\/album\//);
  await expect(page.getByRole("heading", { name: "Sinais" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("list", { name: /Faixas de Sinais/ }).getByRole("button")).toHaveCount(3);
  await page.getByTestId("play-album").click();
  await expect(page.getByTestId("mini-player").getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  await page.goto("/album/not-a-uuid");
  await expect(page.getByText("Página não encontrada")).toBeVisible({ timeout: 20_000 });
});

test("rotas de álbum e envio exigem login", async ({ request }) => {
  const r = await request.post("/api/albums/upload", { data: {} });
  expect([401, 503]).toContain(r.status());
});
