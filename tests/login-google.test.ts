import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { ACAO_PENDENTE_VALIDADE_MS, acaoDaTela, acaoValida, lerAcao, serializarAcao } from "../lib/auth/acao-pendente.ts";
import {
  GOOGLE_CLIENT_ID_PADRAO,
  LOGIN_GIS_POR_PADRAO,
  gerarNonce,
  googleClientId,
  hashNonce,
  loginGisLigado,
  origemGoogleAutorizada,
  parseCredencialGoogle,
  podeMostrarOneTap,
} from "../lib/auth/google.ts";

describe("login com Google Identity Services (#120, fatia 2)", () => {
  it("Client ID público como padrão; variável válida sobrescreve", () => {
    assert.equal(googleClientId(undefined), GOOGLE_CLIENT_ID_PADRAO);
    assert.equal(googleClientId("abc-1.apps.googleusercontent.com"), "abc-1.apps.googleusercontent.com");
    assert.equal(googleClientId("https://evil.example"), GOOGLE_CLIENT_ID_PADRAO);
    assert.match(GOOGLE_CLIENT_ID_PADRAO, /\.apps\.googleusercontent\.com$/);
  });

  it("flag do GIS: padrão no código, variável sobrescreve", () => {
    assert.equal(loginGisLigado(undefined), LOGIN_GIS_POR_PADRAO);
    assert.equal(loginGisLigado("0"), false);
    assert.equal(loginGisLigado("1"), true);
  });

  it("só carrega o Google na origem cadastrada (prévias e CI ficam com o botão antigo)", () => {
    assert.equal(origemGoogleAutorizada("https://radioon-ten.vercel.app", undefined), true);
    assert.equal(origemGoogleAutorizada("https://radioon-git-x-juliobalsinis-projects.vercel.app", undefined), false);
    assert.equal(origemGoogleAutorizada("http://localhost:3000", undefined), false);
    assert.equal(origemGoogleAutorizada("http://localhost:3000", "https://a.app, http://localhost:3000/"), true);
  });

  it("nonce: 64 hex aleatórios; o Google recebe o SHA-256 em hex", async () => {
    const n = gerarNonce();
    assert.match(n, /^[0-9a-f]{64}$/);
    assert.notEqual(n, gerarNonce());
    assert.equal(await hashNonce(n), createHash("sha256").update(n).digest("hex"));
  });

  it("servidor só aceita token com formato de JWT e nonce hex", () => {
    const nonce = "a".repeat(64);
    assert.deepEqual(parseCredencialGoogle("aa.bb.cc", nonce), { token: "aa.bb.cc", nonce });
    assert.equal(parseCredencialGoogle("aa.bb", nonce), null);
    assert.equal(parseCredencialGoogle("aa.bb.cc", "curto"), null);
    assert.equal(parseCredencialGoogle(`a.${"b".repeat(5000)}.c`, nonce), null);
    assert.equal(parseCredencialGoogle(null, nonce), null);
  });

  it("One Tap: só visitante, uma vez por sessão, sem tela cheia/stories/painel e fora do login", () => {
    const base = { conta: false, jaMostrado: false, dialogAberto: false, caminho: "/" };
    assert.equal(podeMostrarOneTap(base), true);
    assert.equal(podeMostrarOneTap({ ...base, conta: true }), false);
    assert.equal(podeMostrarOneTap({ ...base, conta: null }), false);
    assert.equal(podeMostrarOneTap({ ...base, jaMostrado: true }), false);
    assert.equal(podeMostrarOneTap({ ...base, dialogAberto: true }), false);
    for (const c of ["/entrar", "/login", "/termos", "/auth/callback"]) assert.equal(podeMostrarOneTap({ ...base, caminho: c }), false, c);
    assert.equal(podeMostrarOneTap({ ...base, caminho: "/entrarx" }), true);
  });

  it("o servidor chama signInWithIdToken com nonce e tenta vincular a sessão anônima antes", () => {
    const fonte = readFileSync("app/login/actions.ts", "utf8");
    assert.match(fonte, /parseCredencialGoogle\(token, nonce\)/);
    assert.match(fonte, /linkIdentity\(credenciais\)/);
    assert.match(fonte, /signInWithIdToken\(credenciais\)/);
  });
});

describe("ação pendente após entrar (#120)", () => {
  const agora = 1_000_000;
  it("só ids curtos tipo:valor", () => {
    assert.equal(acaoValida("seguir:00000000-0000-4000-8000-000000000201"), true);
    assert.equal(acaoValida("seguir"), false);
    assert.equal(acaoValida("javascript:alert(1)"), false);
    assert.equal(serializarAcao("x", "/", agora), null);
  });

  it("vale por 15 min e só na tela de destino", () => {
    const bruto = serializarAcao("seguir:abc", "/perfil/abc?x=1", agora);
    const p = lerAcao(bruto, agora + 1000);
    assert.ok(p);
    assert.equal(acaoDaTela(p, "seguir:abc", "/perfil/abc"), true);
    assert.equal(acaoDaTela(p, "seguir:abc", "/perfil/outro"), false);
    assert.equal(acaoDaTela(p, "seguir:outro", "/perfil/abc"), false);
    assert.equal(lerAcao(bruto, agora + ACAO_PENDENTE_VALIDADE_MS + 1), null);
    assert.equal(lerAcao("{lixo", agora), null);
    assert.equal(lerAcao(null, agora), null);
  });
});
