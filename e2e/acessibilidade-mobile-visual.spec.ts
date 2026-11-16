import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Acessibilidade automática (issue #185): axe nas telas principais em celular (projetos "iphone" e "android").
// Reprova em violação "serious" ou "critical"; as demais vão anexadas ao relatório do Playwright.

const BLOQUEIA = new Set(["serious", "critical"]);

// Exceção única (DECISIONS 113): cartões ricos (`data-a11y-nome="cartao"`: linha de faixa, card de story) têm nome acessível
// curto com o rótulo visível (título e artista) e metadados visíveis à parte (duração, escutas, gênero). O axe exige todo o
// texto visível no nome (label-content-name-mismatch); para esses cartões a regra vira aviso (vai ao anexo, não reprova).
function excecao(id: string, html: string) {
  return id === "label-content-name-mismatch" && html.includes('data-a11y-nome="cartao"');
}

async function auditar(page: Page, nome: string, testInfo: TestInfo, escopo?: string) {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]);
  if (escopo) axe = axe.include(escopo);
  const { violations } = await axe.analyze();
  const resumo = violations.map((v) => {
    const nos = v.nodes.filter((n) => !excecao(v.id, n.html));
    return {
      id: v.id,
      impacto: nos.length ? v.impact : "aviso (exceção)",
      ajuda: v.help,
      alvos: (nos.length ? nos : v.nodes).slice(0, 5).map((n) => n.target.join(" ")),
    };
  });
  await testInfo.attach(`axe-${testInfo.project.name}-${nome}.json`, {
    body: JSON.stringify(resumo, null, 2),
    contentType: "application/json",
  });
  const graves = resumo.filter((v) => BLOQUEIA.has(v.impacto ?? ""));
  expect(graves, `${nome}: violações graves do axe\n${JSON.stringify(graves, null, 2)}`).toEqual([]);
}

async function abrir(page: Page, caminho: string) {
  await page.goto(caminho);
  await page.waitForLoadState("load");
  // O conteúdo chega por streaming: dá um instante para os limites de Suspense resolverem.
  await page.waitForTimeout(500);
}

test("axe: Home, stories e player", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.getByTestId("visao-tudo").first()).toBeVisible({ timeout: 20_000 });
  await auditar(page, "home", testInfo);

  // Rádio: filtro de faixas.
  const filtros = page.getByRole("navigation", { name: "Filtros" });
  await filtros.getByRole("button", { name: "Faixas" }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
  await auditar(page, "radio-faixas", testInfo);
  await filtros.getByRole("button", { name: "Tudo" }).evaluate((el: HTMLElement) => el.click());

  // Stories (diálogo).
  await page.getByRole("button", { name: "Ver stories de radioOn" }).click();
  const stories = page.getByRole("dialog", { name: /Stories de radioOn/ });
  await expect(stories).toBeVisible();
  await page.waitForTimeout(300);
  await auditar(page, "stories", testInfo);
  await page.keyboard.press("Escape");
  await expect(stories).toBeHidden();

  // Mini player e player cheio (só se houver faixa tocável).
  const play = page.locator("[data-testid=play]:visible").first();
  if (await play.count()) {
    await play.click();
    await page.waitForTimeout(800);
    await auditar(page, "mini-player", testInfo);
    const expandir = page.getByRole("button", { name: /abrir player|player cheio|expandir/i }).first();
    if (await expandir.count()) {
      await expandir.click();
      await page.waitForTimeout(400);
      await auditar(page, "player-cheio", testInfo);
    }
  }
});

for (const [caminho, nome] of [
  ["/explorar", "explorar"],
  ["/biblioteca", "biblioteca"],
  ["/minha-radio", "perfil"],
  ["/ajustes", "configuracoes"],
  ["/enviar", "enviar"],
  ["/login", "login"],
] as const) {
  test(`axe: ${nome}`, async ({ page }, testInfo) => {
    await abrir(page, caminho);
    // Deslogado, enviar redireciona ao login pelo streaming.
    if (nome === "enviar") await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    await auditar(page, nome, testInfo);
  });
}
