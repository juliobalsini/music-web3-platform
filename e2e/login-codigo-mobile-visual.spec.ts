import { readFileSync } from "node:fs";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Issue #120 (fatia 1) em emulação mobile: login por código de 6 dígitos no painel inferior, erros e volta ao ponto de
// origem. O cookie de teste radioon_teste_codigo liga o código na tela; fora de produção o servidor simula o envio e
// aceita 123456 (000000 = expirado), sem falar com o Supabase nem criar sessão.

async function foto(page: Page, nome: string, testInfo: TestInfo) {
  await testInfo.attach(`${testInfo.project.name}-${nome}`, { body: await page.screenshot(), contentType: "image/png" });
}

const PERFIL = "/perfil/00000000-0000-4000-8000-000000000201";

test("Login por código: painel inferior, código errado, expirado e volta ao ponto de origem", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "radioon_teste_codigo", value: "1", url: baseURL! }]);
  await page.goto(PERFIL);
  const seguir = page.locator("[data-testid=botao-seguir]:visible");
  await expect(seguir).toHaveText(/Seguir/, { timeout: 20_000 });
  await expect(page.getByTestId("sessao-lida")).toHaveAttribute("data-conta", "0", { timeout: 20_000 });
  await seguir.click();

  const painel = page.getByTestId("login-contextual");
  await expect(painel).toBeVisible();
  await expect(painel.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  const receber = painel.getByRole("button", { name: "Receber código" });
  await expect(receber).toBeVisible();
  await foto(page, "01-email", testInfo);

  await painel.getByLabel("E-mail").fill("teste@example.com");
  await receber.click();
  const etapa = painel.getByTestId("etapa-codigo");
  await expect(etapa).toBeVisible();
  await expect(etapa.getByText("teste@example.com")).toBeVisible();
  await expect(etapa.getByRole("button", { name: /Reenviar em \d+ s/ })).toBeDisabled();
  const codigo = etapa.getByLabel("Código de 6 dígitos");
  await expect(codigo).toHaveAttribute("inputmode", "numeric");
  await expect(codigo).toHaveAttribute("autocomplete", "one-time-code");
  await expect(codigo).toBeFocused();
  await foto(page, "02-codigo", testInfo);

  // Errado: verifica sozinho ao completar 6 dígitos; limpa o campo e explica.
  await codigo.fill("111111");
  await expect(etapa.getByText("Código errado. Confira os 6 dígitos do último e-mail.")).toBeVisible();
  await expect(codigo).toHaveValue("");
  await foto(page, "03-codigo-errado", testInfo);

  // Expirado (colar com espaço também vale).
  await codigo.fill("000 000");
  await expect(etapa.getByText(/expirado/)).toBeVisible();

  // Trocar e-mail volta à 1ª etapa com o e-mail preenchido.
  await etapa.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(painel.getByLabel("E-mail")).toHaveValue("teste@example.com");
  await painel.getByRole("button", { name: "Receber código" }).click();

  // Certo: recarrega a tela de origem inteira (para ler a sessão nova) e volta exatamente a ela.
  await page.evaluate(() => ((window as unknown as { __antes?: boolean }).__antes = true));
  await painel.getByLabel("Código de 6 dígitos").fill("123456");
  // Durante a navegação o evaluate falha: conta como "ainda não recarregou".
  await expect.poll(() => page.evaluate(() => (window as unknown as { __antes?: boolean }).__antes ?? false).catch(() => true), { timeout: 20_000 }).toBe(false);
  expect(new URL(page.url()).pathname).toBe(PERFIL);
  await expect(page.locator("[data-testid=botao-seguir]:visible")).toBeVisible({ timeout: 20_000 });
});

test("Login por código: /login direto também usa o código e volta ao next", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "radioon_teste_codigo", value: "1", url: baseURL! }]);
  await page.goto("/login?next=%2Fexplorar");
  // Só o visível: durante o streaming o conteúdo novo existe por instantes oculto, antes da troca.
  const receber = page.getByRole("button", { name: "Receber código" }).filter({ visible: true });
  await expect(receber).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("E-mail").filter({ visible: true }).fill("teste@example.com");
  await receber.click();
  await page.getByLabel("Código de 6 dígitos").filter({ visible: true }).fill("123456");
  await page.waitForURL((u) => u.pathname === "/explorar", { timeout: 20_000 });
});

test("Modelos de e-mail com código cabem no celular, claro e escuro", async ({ page }, testInfo) => {
  for (const nome of ["magic-link", "confirm-signup", "change-email"]) {
    const html = readFileSync(`docs/email-templates/${nome}.html`, "utf8").replace("{{ .Token }}", "482915");
    for (const esquema of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: esquema });
      await page.setViewportSize({ width: 360, height: 640 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("482915")).toBeVisible();
      await expect(page.getByText("Vale por 10 minutos.")).toBeVisible();
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(largura, `${nome} (${esquema}) estoura a largura`).toBeLessThanOrEqual(360);
      if (nome === "magic-link") {
        await testInfo.attach(`${testInfo.project.name}-email-${esquema}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      }
    }
  }
});
