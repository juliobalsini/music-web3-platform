import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { verificarDiretorio, verificarWorkflow } from "../scripts/ci/verificar-workflows.mjs";

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
});
