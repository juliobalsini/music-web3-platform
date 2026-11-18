import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Editor de playlist logado (issue #122) em emulação mobile. A prévia não tem conta de teste: o cookie de teste
// `radioon_demo_editor=1` abre o rascunho de demonstração …0701 como "seu" (só fora de produção) e as ações do editor
// respondem sem gravar nada (lib/playlists/demo-editor.ts). Faixas iniciais: Madrugada no Convés (destaque e nota),
// Faróis e Ondas curtas.

const PL = "/playlist/00000000-0000-4000-8000-000000000701";

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

const titulos = (page: Page) => page.getByTestId("faixa-editor").locator("span.truncate.font-medium").allInnerTexts();

test("sem o cookie de teste, o rascunho de demonstração não existe", async ({ page }) => {
  await page.goto(PL);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("editor-playlist")).toHaveCount(0);
});

test("editor logado: adicionar, publicar, reordenar, remover, curadoria e Tema da semana", async ({ page, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  await page.context().addCookies([{ name: "radioon_demo_editor", value: "1", url: baseURL! }]);
  await page.goto(PL);
  // Só o do <main>: por um instante o HTML do Suspense em streaming deixa uma cópia oculta fora dele.
  const editor = page.getByRole("main").getByTestId("editor-playlist");
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("textbox", { name: "Título da playlist" })).toHaveValue("Rascunho de teste");
  await expect.poll(() => titulos(page)).toEqual(["Madrugada no Convés", "Faróis", "Ondas curtas"]);
  await expect(editor.getByText("Faltam 2 faixas para publicar.")).toBeVisible();
  await expect(page.getByTestId("publicar")).toBeDisabled();
  await foto(page, "editor-01-rascunho", testInfo);

  // Título: salvamento automático.
  await page.getByRole("textbox", { name: "Título da playlist" }).fill("Rascunho de teste editado");
  await expect(editor.getByRole("status")).toHaveText("Rascunho privado · salvo", { timeout: 10_000 });

  // Adicionar pela busca do painel.
  await page.getByTestId("adicionar-faixas").click();
  const painel = page.getByRole("dialog", { name: "Adicionar faixas" });
  await expect(painel).toBeVisible();
  await foto(page, "editor-02-adicionar", testInfo);
  for (const t of ["Vitrola azul", "Porto sem pressa"]) {
    await painel.getByRole("textbox", { name: "Buscar faixa ou artista" }).fill(t);
    await painel.getByRole("button", { name: `Adicionar ${t}`, exact: true }).click();
  }
  await painel.getByRole("button", { name: "Fechar" }).click();
  await expect(painel).toBeHidden();
  await expect.poll(() => titulos(page)).toEqual(["Madrugada no Convés", "Faróis", "Ondas curtas", "Vitrola azul", "Porto sem pressa"]);

  // Publicar: habilitado com 5 faixas; a demonstração recusa (nada é gravado) e o aviso aparece.
  await expect(page.getByTestId("publicar")).toBeEnabled();
  await page.getByTestId("publicar").click();
  await expect(editor.getByRole("alert")).toHaveText("Demonstração: a playlist não é publicada.");

  // Reordenar pelo teclado na alça.
  const alca = page.getByRole("button", { name: /^Mover Porto sem pressa/ });
  await alca.focus();
  await alca.press("ArrowUp");
  await expect.poll(() => titulos(page)).toEqual(["Madrugada no Convés", "Faróis", "Ondas curtas", "Porto sem pressa", "Vitrola azul"]);

  // Remover pela lixeira.
  await page.getByRole("button", { name: "Remover Faróis", exact: true }).click();
  await expect.poll(() => titulos(page)).toEqual(["Madrugada no Convés", "Ondas curtas", "Porto sem pressa", "Vitrola azul"]);
  await expect(editor.getByText("Faltam 1 faixa para publicar.")).toBeVisible();

  // Curadoria: destacar e nota.
  await page.getByRole("button", { name: /^Curadoria de Ondas curtas/ }).click();
  const cura = page.getByRole("dialog", { name: "Ondas curtas" });
  await expect(cura).toBeVisible();
  await cura.getByTestId("curadoria-destacar").click();
  await expect(cura.getByTestId("curadoria-destacar")).toHaveAttribute("aria-checked", "true");
  await cura.getByTestId("curadoria-nota").fill("Para a estrada.");
  await foto(page, "editor-03-curadoria", testInfo);
  await cura.getByTestId("curadoria-salvar-nota").click();
  await expect(cura).toBeHidden();
  const linha = page.getByTestId("faixa-editor").nth(1);
  await expect(linha.getByText("“Para a estrada.”")).toBeVisible();
  await expect(linha.getByLabel("Em destaque")).toBeVisible();

  // Tema da semana.
  const tema = page.getByTestId("marcar-tema");
  await tema.scrollIntoViewIfNeeded();
  await expect(tema).toHaveAttribute("aria-checked", "false");
  await tema.click();
  await expect(tema).toHaveAttribute("aria-checked", "true");
  await foto(page, "editor-04-final", testInfo);
});
