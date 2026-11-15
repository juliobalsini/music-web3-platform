import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  codigoCompleto,
  LOGIN_CODIGO_POR_PADRAO,
  loginPorCodigoLigado,
  mensagemErroCodigo,
  normalizarCodigo,
  parseTipoCodigo,
  segundosParaReenviar,
} from "../lib/auth/codigo.ts";

describe("login por código (#120)", () => {
  it("flag: padrão no código, variável sobrescreve", () => {
    assert.equal(loginPorCodigoLigado(undefined), LOGIN_CODIGO_POR_PADRAO);
    assert.equal(loginPorCodigoLigado("1"), true);
    assert.equal(loginPorCodigoLigado("0"), false);
    assert.equal(loginPorCodigoLigado("talvez"), LOGIN_CODIGO_POR_PADRAO);
  });

  it("aceita colar o código com espaços, traços ou texto", () => {
    assert.equal(normalizarCodigo("123 456"), "123456");
    assert.equal(normalizarCodigo("Código: 123-456"), "123456");
    assert.equal(normalizarCodigo("1234567890"), "123456");
    assert.equal(normalizarCodigo(null), "");
    assert.ok(codigoCompleto(" 12 34 56 "));
    assert.ok(!codigoCompleto("12345"));
  });

  it("reenviar só depois de 60 s", () => {
    assert.equal(segundosParaReenviar(0, 0), 60);
    assert.equal(segundosParaReenviar(0, 59_001), 1);
    assert.equal(segundosParaReenviar(0, 60_000), 0);
    assert.equal(segundosParaReenviar(0, 999_999), 0);
  });

  it("tipo de verificação nunca vem livre do cliente", () => {
    assert.equal(parseTipoCodigo("email_change"), "email_change");
    assert.equal(parseTipoCodigo("signup"), "email");
    assert.equal(parseTipoCodigo("recovery"), "email");
    assert.equal(parseTipoCodigo(undefined), "email");
  });

  it("mensagens claras para errado, expirado e excesso", () => {
    assert.match(mensagemErroCodigo({ code: "otp_expired", message: "Token has expired or is invalid" }), /expirado/);
    assert.match(mensagemErroCodigo({ code: "otp_invalid" }), /Código errado/);
    assert.match(mensagemErroCodigo({ status: 429 }), /Espere um minuto/);
    assert.match(mensagemErroCodigo(null), /Código errado/);
  });

  it("modo de teste do servidor nunca vale em produção", () => {
    const s = readFileSync("app/login/actions.ts", "utf8");
    assert.match(s, /VERCEL_ENV === "production"\) return false/);
    // O envio por código não manda link (sem emailRedirectTo nas chamadas novas).
    const envio = s.slice(s.indexOf("export async function enviarCodigo"), s.indexOf("export async function verificarCodigo"));
    assert.ok(!envio.includes("emailRedirectTo"));
  });
});

describe("modelos de e-mail (#120)", () => {
  for (const nome of ["magic-link", "confirm-signup", "change-email"]) {
    it(`${nome}: código em destaque, sem link, identidade e textos pedidos`, () => {
      const html = readFileSync(`docs/email-templates/${nome}.html`, "utf8");
      const txt = readFileSync(`docs/email-templates/${nome}.txt`, "utf8");
      for (const s of [html, txt]) {
        assert.ok(s.includes("{{ .Token }}"));
        assert.ok(!s.includes("ConfirmationURL"));
        assert.ok(s.includes("Vale por 10 minutos."));
        assert.ok(s.includes("Se não foi você, ignore este e-mail."));
        assert.ok(s.includes("radioOn · Música para os melhores ouvintes."));
      }
      assert.ok(html.includes("#00112A") && html.includes("#E89A3C"));
      assert.ok(html.includes('src="https://radioon-ten.vercel.app/brand/logo.png"'));
      assert.ok(!/<script/i.test(html));
    });
  }
});
