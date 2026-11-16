import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuid } from "../lib/playlists/rules.ts";
import { CURADORES_OFICIAIS, curadorDaSelecao, curadoresAtivos, curadorOficial, ehPerfilOficial, IDS_OFICIAIS, selecoesDoCurador } from "../lib/radio/curadores.ts";
import { PLATAFORMA_ID, selecaoRadioOn } from "../lib/radio/home.ts";
import { podeSeguir } from "../lib/seguir/rules.ts";

const agora = Date.parse("2026-11-16T12:00:00Z");
const f = (n: number, genre: string | null, mood: string | null = null) => ({ id: `t${n}`, genre, mood, createdAt: new Date(agora - n * 3600_000).toISOString() });

describe("curadores oficiais", () => {
  it("um por gênero (menos Outro), ids UUID fixos e únicos, nome 'radioOn <Gênero>'", () => {
    assert.ok(CURADORES_OFICIAIS.length > 10);
    assert.ok(!CURADORES_OFICIAIS.some((c) => c.genero === "outro"));
    assert.equal(new Set(CURADORES_OFICIAIS.map((c) => c.id)).size, CURADORES_OFICIAIS.length);
    for (const c of CURADORES_OFICIAIS) assert.ok(isUuid(c.id), c.id);
    assert.equal(curadorOficial(CURADORES_OFICIAIS.find((c) => c.genero === "jazz")!.id)?.nome, "radioOn Jazz");
    assert.equal(CURADORES_OFICIAIS[0].id, "00000000-0000-4000-8000-000000000101");
  });

  it("assina as seleções de gênero; novidades e climas ficam com o perfil radioOn", () => {
    const sel = selecaoRadioOn([f(1, "jazz", "chuva"), f(2, "jazz"), f(3, "jazz"), f(4, "rock")], agora);
    const jazz = sel.find((s) => s.id === "radioon-genero-jazz")!;
    assert.equal(curadorDaSelecao(jazz).nome, "radioOn Jazz");
    assert.equal(curadorDaSelecao(sel.find((s) => s.tipo === "novidades")!).id, PLATAFORMA_ID);
    assert.equal(curadorDaSelecao(sel.find((s) => s.tipo === "clima")!).id, PLATAFORMA_ID);
    const idJazz = curadorDaSelecao(jazz).id;
    assert.deepEqual(selecoesDoCurador(sel, idJazz).map((s) => s.id), ["radioon-genero-jazz"]);
    assert.deepEqual(curadoresAtivos(sel).map((c) => c.nome), ["radioOn Jazz"]);
    // Rock tem só 1 faixa: sem seleção, o curador não aparece.
    const rock = CURADORES_OFICIAIS.find((c) => c.genero === "rock")!;
    assert.deepEqual(selecoesDoCurador(sel, rock.id), []);
  });

  it("perfis oficiais não podem ser seguidos", () => {
    const c = CURADORES_OFICIAIS[0].id;
    assert.ok(ehPerfilOficial(c) && ehPerfilOficial(PLATAFORMA_ID) && !ehPerfilOficial("x"));
    assert.equal(podeSeguir("u", c, IDS_OFICIAIS), false);
    assert.equal(podeSeguir("u", PLATAFORMA_ID, IDS_OFICIAIS), false);
    assert.equal(podeSeguir("u", "outro", IDS_OFICIAIS), true);
  });
});
