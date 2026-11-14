import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { verificarDiretorio, verificarTravas, verificarWorkflow } from "../scripts/ci/verificar-workflows.mjs";

const regras = (y: string) => verificarWorkflow("x.yml", y).map((e: string) => e.slice(0, 2));

describe("scripts/ci/verificar-workflows", () => {
  it("os workflows reais do repositório passam", () => {
    assert.deepEqual(verificarDiretorio(".github/workflows"), []);
  });

  it("R1: issues sem checar o autor reprova; com a checagem passa", () => {
    const ruim = "on:\n  issues:\n    types: [labeled]\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo oi\n";
    assert.deepEqual(regras(ruim), ["R1"]);
    const bom = ruim.replace(
      "    runs-on",
      "    if: github.event.issue.user.login == 'juliobalsini'\n    runs-on",
    );
    assert.deepEqual(regras(bom), []);
  });

  it("R1: issue_comment exige o autor do comentário", () => {
    const y =
      "on:\n  issue_comment:\n    types: [created]\njobs:\n  a:\n    if: >-\n      github.event.issue.user.login == 'juliobalsini'\n    runs-on: x\n    steps:\n      - run: echo\n";
    assert.deepEqual(regras(y), ["R1"]);
  });

  it("R2: título/corpo/comentário/head_ref em run reprovam; via env passam", () => {
    const base = "on: workflow_dispatch\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo \"${{ github.head_ref }}\"\n";
    assert.deepEqual(regras(base), ["R2"]);
    const bloco = "on: workflow_dispatch\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: |\n          echo ${{ github.event.comment.body }}\n";
    assert.deepEqual(regras(bloco), ["R2"]);
    const env = "on: workflow_dispatch\njobs:\n  a:\n    runs-on: x\n    steps:\n      - env:\n          T: ${{ github.event.issue.title }}\n        run: echo \"$T\"\n";
    assert.deepEqual(regras(env), []);
  });

  it("R3: pull_request_target, write-all e cancelamento arriscado reprovam", () => {
    assert.deepEqual(regras("on:\n  pull_request_target:\njobs: {}\n"), ["R3"]);
    assert.deepEqual(regras("on: push\npermissions: write-all\njobs: {}\n"), ["R3"]);
    assert.deepEqual(
      regras("on:\n  schedule:\n    - cron: '0 0 * * *'\nconcurrency:\n  group: g\n  cancel-in-progress: true\njobs: {}\n"),
      ["R3"],
    );
    // só pull_request: um novo commit invalida a aprovação, cancelar é correto
    assert.deepEqual(
      regras("on:\n  pull_request:\nconcurrency:\n  group: g\n  cancel-in-progress: true\njobs:\n  a:\n    environment: travas\n    runs-on: x\n"),
      [],
    );
  });

  it("R4: bloco TRAVAS igual passa; alterado, com linha a mais ou removido reprova", () => {
    const md = (t: string) => `# x\nregras livres\n<!-- TRAVAS:INICIO (protegida) -->\n${t}\n<!-- TRAVAS:FIM -->\nfim\n`;
    const base = md("- Nunca: DROP.\n- Protegidos: gate.");
    assert.deepEqual(verificarTravas(base, base.replace("regras livres", "outras regras")), []);
    assert.deepEqual(verificarTravas(base, md("- Nunca: DROP.\n\n- Protegidos: gate.   ")), []);
    const r = (pr: string) => verificarTravas(base, pr).map((e: string) => e.slice(0, 2));
    assert.deepEqual(r(md("- Nunca: DROP.\n- Protegidos: nada.")), ["R4"]);
    assert.deepEqual(r(md("- Nunca: DROP.")), ["R4"]);
    assert.deepEqual(r(md("- Nunca: DROP.\n- Protegidos: gate.\n- Nova regra.")), ["R4"]);
    assert.deepEqual(r("# sem bloco\n"), ["R4"]);
    assert.deepEqual(verificarTravas("# main sem bloco\n", "# x\n"), []);
  });

  it("R4: o CLAUDE.md atual tem o bloco TRAVAS", () => {
    const atual = readFileSync("CLAUDE.md", "utf8");
    assert.deepEqual(verificarTravas(atual, atual), []);
    assert.match(atual, /<!-- TRAVAS:INICIO[^>]*-->[\s\S]+<!-- TRAVAS:FIM -->/);
  });
});
