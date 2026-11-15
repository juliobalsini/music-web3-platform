import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Issue #156 em emulação mobile (projetos "iphone" e "android"): Home sem círculos de stories, Player On primeiro,
// "Artistas para conhecer" com cards de story de bio, seguido com story novo primeiro, e a ordem do Explorar.
// Dados: demonstração das prévias (Lia Norte e Maré Alta com foto; Duo Vitrola sem foto = sem story de bio;
// Lia tem 1 story postado). "Sigo a Lia" é simulado pelo cookie de teste radioon_demo_segue (só fora de produção).

/** Rótulos dos cards na ordem, só da demonstração (a prévia pode ter stories reais do banco entre eles). */
const DEMO = /radioOn|Lia Norte|Maré Alta/;
const rotulos = async (page: Page) =>
  (await page.getByRole("region", { name: "Stories", exact: true }).getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))).filter((r) => DEMO.test(r));

const LIA = "00000000-0000-4000-8000-000000000101";

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

async function home(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "No ar", exact: true })).toBeVisible({ timeout: 20_000 });
}

test("Home: Player On primeiro, sem círculos; Artistas para conhecer com cards de bio", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await home(page);
  await expect(page.getByTestId("stories-circulos")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Stories", exact: true })).toHaveCount(0);
  // Ordem: Player On → clima → Seleção radioOn → Artistas para conhecer.
  let ultimo = -1;
  for (const n of ["No ar", /Agora combina com/, "Seleção radioOn", "Artistas para conhecer"] as const) {
    const caixa = await page.getByRole("region", { name: n, exact: typeof n === "string" }).first().boundingBox();
    expect(caixa, String(n)).not.toBeNull();
    expect(caixa!.y).toBeGreaterThan(ultimo);
    ultimo = caixa!.y;
  }
  const linha = page.getByTestId("linha-artistas");
  // Visitante novo: boas-vindas da radioOn primeiro; depois só bios (nenhum story postado de artista na Home).
  await expect(linha.getByRole("button").first()).toHaveAccessibleName("Ver stories de radioOn");
  await expect(linha.getByRole("button", { name: "Conhecer Lia Norte" })).toBeVisible();
  await expect(linha.getByRole("button", { name: "Conhecer Maré Alta" })).toBeVisible();
  await expect(linha.getByRole("button", { name: /Duo Vitrola/ })).toHaveCount(0); // sem foto: sem story de bio
  await expect(linha.getByRole("button", { name: "Ver stories de Lia Norte" })).toHaveCount(0);
  await linha.scrollIntoViewIfNeeded();
  await foto(page, "bio-01-home", testInfo);

  // Card de bio: foto, nome, gênero, frase, trecho da faixa com Ouvir e Seguir.
  await linha.getByRole("button", { name: "Conhecer Lia Norte" }).click();
  const visor = page.getByRole("dialog", { name: "Stories de Lia Norte" });
  await expect(visor).toBeVisible();
  const bio = visor.getByTestId("story-bio");
  await expect(bio.getByRole("img", { name: "Foto de Lia Norte" })).toBeVisible();
  await expect(bio.getByRole("heading", { name: "Lia Norte" })).toBeVisible();
  await expect(bio.getByText("Canções de porto, violão e voz para ouvir devagar.")).toBeVisible();
  await expect(bio.getByTestId("story-faixa").getByRole("link", { name: "Ouvir" })).toHaveAttribute("href", /\/faixa\//);
  await expect(bio.getByTestId("botao-seguir")).toHaveText("Seguir");
  // Bio é o próprio perfil: sem comentar, curtir, compartilhar nem menu.
  await expect(visor.getByRole("textbox", { name: "Comentar" })).toHaveCount(0);
  await expect(visor.getByRole("button", { name: "Mais opções" })).toHaveCount(0);
  await foto(page, "bio-02-story", testInfo);
  // Visitante: Seguir abre o login contextual, que volta ao perfil do artista.
  await bio.getByTestId("botao-seguir").click();
  const login = page.getByRole("dialog", { name: "Entre para continuar" });
  await expect(login).toBeVisible({ timeout: 15_000 });
  await expect(login.locator('input[name="next"]')).toHaveValue(`/perfil/${LIA}`);
  await login.getByRole("button", { name: "Fechar" }).click();
  await visor.getByRole("button", { name: "Fechar stories" }).click();
  await expect(visor).toBeHidden();
  // Conta como visto depois da primeira visualização.
  await expect(linha.getByRole("button", { name: "Conhecer Lia Norte" })).toHaveAttribute("data-visto", "sim");
});

test("Home: artista seguido com story novo vem primeiro, com selo, e abre os stories postados", async ({ page, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  await page.context().addCookies([{ name: "radioon_demo_segue", value: LIA, url: baseURL! }]);
  // Já viu as boas-vindas: não é mais visitante novo.
  await page.addInitScript(() => localStorage.setItem("radioon_stories_vistos", JSON.stringify(["00000000-0000-4000-8000-0000000000a2", "00000000-0000-4000-8000-000000000502"])));
  await home(page);
  const linha = page.getByTestId("linha-artistas");
  const primeiro = linha.getByRole("button").first();
  await expect(primeiro).toHaveAccessibleName("Ver stories de Lia Norte");
  await expect(primeiro).toHaveAttribute("data-tipo", "novidade");
  await expect(primeiro.getByText("Novo", { exact: true })).toBeVisible();
  // A bio da Lia não se repete; a da Maré segue na linha.
  await expect(linha.getByRole("button", { name: "Conhecer Lia Norte" })).toHaveCount(0);
  await expect(linha.getByRole("button", { name: "Conhecer Maré Alta" })).toBeVisible();
  await linha.scrollIntoViewIfNeeded();
  await foto(page, "bio-03-seguido-novo", testInfo);
  await primeiro.click();
  const visor = page.getByRole("dialog", { name: "Stories de Lia Norte" });
  await expect(visor.getByText("Ensaio aberto hoje à noite")).toBeVisible();
  await visor.getByRole("button", { name: "Fechar stories" }).click();
});

test("Explorar: stories abaixo da busca — postados de quem sigo, recentes, bios não vistas, bios vistas", async ({ page, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/explorar");
  const sec = page.getByRole("region", { name: "Stories", exact: true });
  await expect(sec).toBeVisible({ timeout: 20_000 });
  // Abaixo da busca.
  const [busca, caixa] = await Promise.all([page.getByRole("search").boundingBox(), sec.boundingBox()]);
  expect(caixa!.y).toBeGreaterThan(busca!.y);
  // Sem seguir ninguém: radioOn (boas-vindas) primeiro, postado da Lia, depois as bios.
  await expect.poll(() => rotulos(page)).toEqual(["Ver stories de radioOn", "Ver stories de Lia Norte", "Conhecer Lia Norte", "Conhecer Maré Alta"]);
  await foto(page, "bio-04-explorar", testInfo);

  // Seguindo a Lia e com a bio dela já vista: o postado dela vem primeiro e a bio vista vai ao fim.
  await page.context().addCookies([{ name: "radioon_demo_segue", value: LIA, url: baseURL! }]);
  await sec.getByRole("button", { name: "Conhecer Lia Norte" }).click();
  await page.getByRole("dialog", { name: "Stories de Lia Norte" }).getByRole("button", { name: "Fechar stories" }).click();
  await page.reload();
  await expect(sec).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => rotulos(page)).toEqual(["Ver stories de Lia Norte", "Ver stories de radioOn", "Conhecer Maré Alta", "Conhecer Lia Norte"]);
});
