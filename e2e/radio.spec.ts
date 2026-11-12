import { expect, test, type Page } from "@playwright/test";

// Telas do redesenho mobile-first. Rodam em viewport de celular.
test.use({ viewport: { width: 390, height: 844 } });

/** A Rádio chega em streaming: os stories só aparecem quando o conteúdo carregou. */
async function radioCarregada(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Stories" })).toBeVisible({ timeout: 20_000 });
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

test("Home segue a ordem: stories, No ar, Agora combina, Seleção radioOn, Artistas", async ({ page }) => {
  await radioCarregada(page);
  // Cabeçalho: logo e selo na mesma linha; o selo nunca aparece só "No ar".
  const selo = page.getByTestId("selo-no-ar");
  await expect(selo).toContainText(/No ar\s*· \d+ ouvindo/);
  const [l, s] = await Promise.all([page.getByRole("link", { name: "radioOn, início" }).boundingBox(), selo.boundingBox()]);
  expect(Math.abs((l!.y + l!.height / 2) - (s!.y + s!.height / 2))).toBeLessThan(20);
  // Sempre há o story da plataforma, primeiro.
  await expect(page.getByRole("region", { name: "Stories" }).getByRole("button").first()).toHaveAccessibleName("Ver stories de radioOn");
  const nomes = ["Stories", "No ar", /Agora combina com/, "Seleção radioOn", "Faixas", "Artistas para conhecer"] as const;
  let ultimo = -1;
  for (const n of nomes) {
    const caixa = await page.getByRole("region", { name: n, exact: typeof n === "string" }).first().boundingBox();
    expect(caixa, String(n)).not.toBeNull();
    expect(caixa!.y).toBeGreaterThan(ultimo);
    ultimo = caixa!.y;
  }
  await expect(page.getByRole("region", { name: "A seguir" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "A seguir" }).getByRole("button")).toHaveCount(3);
  // Sem busca na Home (é do Explorar); os filtros são visões próprias.
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Filtros" }).getByRole("button")).toHaveText(["Tudo", "Faixas", "Álbuns", "Playlists", "Stories"]);
});

test("story de boas-vindas abre e a Seleção radioOn tem página", async ({ page }) => {
  await radioCarregada(page);
  await page.getByRole("button", { name: "Ver stories de radioOn" }).click();
  // O boas-vindas fixo é o mais novo do grupo (vem por último; a demonstração tem outro antes).
  const visor = page.getByRole("dialog", { name: /Stories de radioOn/ });
  while (!(await visor.getByText("Ouvir: é só dar play").isVisible())) await visor.getByRole("button", { name: "Próximo story" }).click();
  await expect(visor.getByText("Ouvir: é só dar play")).toBeVisible();
  await expect(visor.getByRole("button", { name: "Denunciar" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("region", { name: "Seleção radioOn" }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/playlist\/radioon-/);
  await expect(page.getByRole("link", { name: "radioOn", exact: true })).toBeVisible();
});

const DEMO = /Madrugada no Convés|Faróis|Ondas curtas|Vitrola azul|Porto sem pressa|Sinal âmbar|Maré de domingo|Fio de prata/;

// Fora de produção a Rádio tem o catálogo de demonstração (lib/radio/demo.ts, áudio local): estes
// testes nunca são pulados e exercitam lista, play, mini player e player cheio.
test("Rádio cheia: cartão No ar, grade, abas e Seleção radioOn", async ({ page }) => {
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
  await expect(page.getByRole("region", { name: "Seleção radioOn" })).toBeVisible();
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

test("Álbuns: na Rádio, página do álbum e tocar álbum", async ({ page }) => {
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

const STORY_DEMO = "00000000-0000-4000-8000-000000000501";
const STORY_ARQUIVADO = "00000000-0000-4000-8000-000000000503";

test("Stories: faixa na home, visor com trecho, compartilhar e denunciar", async ({ page }) => {
  await radioCarregada(page);
  const faixa = page.getByRole("region", { name: "Stories", exact: true });
  await expect(faixa).toBeVisible();
  await faixa.getByRole("button", { name: /Ver stories de Lia Norte/ }).click();
  const visor = page.getByRole("dialog", { name: /Stories de Lia Norte/ });
  await expect(visor).toBeVisible();
  await expect(visor.getByText("Ensaio aberto hoje à noite")).toBeVisible();
  await expect(visor.getByTestId("trecho")).toBeVisible();
  const compartilhar = visor.getByRole("region", { name: "Compartilhar story" });
  for (const n of ["Compartilhar", "Baixar cartão", "WhatsApp", "Facebook", "LinkedIn", "Instagram: abrir cartão"]) {
    await expect(compartilhar.getByText(n, { exact: true })).toBeVisible();
  }
  await expect(compartilhar.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  // Denunciar exige conta: visitante é convidado a entrar.
  await visor.getByRole("button", { name: "Denunciar" }).click();
  await expect(visor.getByText(/Entre com uma conta para denunciar/)).toBeVisible({ timeout: 15_000 });
  await visor.getByRole("button", { name: "Fechar stories" }).click();
  await expect(visor).toBeHidden();
});

test("Story: página com Open Graph, cartão 9:16 e arquivo no perfil", async ({ page, request }) => {
  await page.goto(`/story/${STORY_DEMO}`);
  await expect(page.getByText("Ensaio aberto hoje à noite")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`/api/stories/${STORY_DEMO}/cartao$`));
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "1920");
  const img = await request.get(`/api/stories/${STORY_DEMO}/cartao`);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
  expect((await request.get("/api/stories/00000000-0000-4000-8000-0000000005ff/cartao")).status()).toBe(404);
  // Story com mais de 7 dias já saiu da home, mas segue na página e no perfil do autor.
  await page.goto(`/story/${STORY_ARQUIVADO}`);
  await expect(page.getByText("Arquivado no perfil")).toBeVisible({ timeout: 20_000 });
  await page.goto("/perfil/00000000-0000-4000-8000-000000000201");
  await expect(page.getByRole("region", { name: "Stories do perfil" }).getByText("Arquivado")).toBeVisible({ timeout: 20_000 });
});

test("Stories: publicar e denunciar exigem conta; novo story redireciona ao login", async ({ page, request }) => {
  expect([401, 503]).toContain((await request.post("/api/stories", { data: { body: "oi" } })).status());
  expect([401, 503]).toContain((await request.post(`/api/stories/${STORY_DEMO}/denunciar`, { data: {} })).status());
  await page.goto("/stories/novo");
  await expect(page).toHaveURL(/\/login\?next=%2Fstories%2Fnovo/);
});

test("Continue ouvindo: grade de atalhos, progresso e retomada do ponto exato", async ({ page }) => {
  await radioCarregada(page);
  await page.getByRole("list", { name: "Descobertas" }).getByRole("button", { name: DEMO }).first().click();
  await expect(page.getByTestId("mini-player").getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  await page.getByTestId("mini-player").getByRole("button", { name: "Pausar" }).click();
  // Visitar um álbum e um perfil também entra no histórico (mistura de tipos).
  await page.goto("/album/00000000-0000-4000-8000-000000000401");
  await expect(page.getByRole("heading", { name: "Sinais" })).toBeVisible({ timeout: 20_000 });
  await page.goto("/");
  const secao = page.getByRole("region", { name: "Continue ouvindo" });
  await expect(secao).toBeVisible({ timeout: 20_000 });
  const n = await secao.getByRole("listitem").count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(6);
  await expect(secao.getByTestId("progresso").first()).toBeVisible();
  // Toque na faixa retoma de onde parou (≥ 2 s), não do zero.
  await secao.getByRole("button", { name: /^Retomar/ }).first().click();
  await expect(page.getByTestId("mini-player").getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => document.querySelector("audio")!.currentTime), { timeout: 10_000 }).toBeGreaterThan(1.5);
});

test("Filtros são visões próprias e lembram a rolagem", async ({ page }) => {
  await radioCarregada(page);
  const filtros = page.getByRole("navigation", { name: "Filtros" });
  await filtros.getByRole("button", { name: "Faixas" }).click();
  await expect(page.getByRole("region", { name: "Últimas adicionadas" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Ordenar" }).getByRole("button")).toHaveText(["Recentes", "Mais ouvidas", "Mais curtidas", "A–Z"]);
  await expect(page.getByTestId("tocar-tudo")).toBeVisible();
  await expect(page.getByTestId("aleatorio")).toBeVisible();
  await page.getByRole("group", { name: "Ordenar" }).getByRole("button", { name: "A–Z" }).click();
  const titulos = await page.getByTestId("catalogo").getByTestId("titulo-faixa").allTextContents();
  expect(titulos.length).toBeGreaterThanOrEqual(8);
  expect(titulos).toEqual([...titulos].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })));
  await expect(page.getByTestId("catalogo").getByRole("link").first()).toHaveAttribute("href", /\/perfil\//);
  // Rolagem própria de cada filtro.
  await page.evaluate(() => window.scrollTo(0, 400));
  await filtros.getByRole("button", { name: "Playlists" }).click();
  await expect(page.getByTestId("criar-playlist")).toBeVisible();
  await expect(page.getByRole("region", { name: "Seleção radioOn" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await filtros.getByRole("button", { name: "Faixas" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await filtros.getByRole("button", { name: "Stories" }).click();
  await expect(page.getByTestId("stories-grade").getByRole("button").first()).toBeVisible();
});
