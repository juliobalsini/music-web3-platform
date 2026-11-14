import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { destinoAtual, motivoPadrao } from "../lib/auth/contextual.ts";

describe("login contextual", () => {
  it("volta à tela atual, com a busca", () => {
    assert.equal(destinoAtual({ pathname: "/perfil/abc", search: "?aba=faixas" }), "/perfil/abc?aba=faixas");
    assert.equal(destinoAtual({ pathname: "/" }), "/");
  });

  it("nunca devolve destino externo", () => {
    assert.equal(destinoAtual({ pathname: "//evil.example", search: "" }), "/");
    assert.equal(destinoAtual({ pathname: "/\\evil.example" }), "/");
  });

  it("tem motivo padrão curto", () => {
    assert.ok(motivoPadrao().length < 80);
  });

  it("ações que exigem conta abrem o painel, sem link solto para /login", () => {
    const arquivos = ["components/player-cheio.tsx", "components/story-paineis.tsx", "components/visualizador-stories.tsx", "components/nav-inferior.tsx", "components/botao-seguir.tsx"];
    for (const f of arquivos) {
      const s = readFileSync(f, "utf8");
      assert.ok(!/href=\{?[`"]\/login/.test(s), `${f} ainda leva à tela de login`);
      assert.ok(/useLoginContextual|BotaoEntrar|LinkConta/.test(s), `${f} não usa o login contextual`);
    }
  });

  it("o painel está montado no layout", () => {
    assert.match(readFileSync("app/layout.tsx", "utf8"), /<LoginContextualProvider>/);
  });
});
