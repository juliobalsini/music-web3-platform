import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { classificar, sensiveis } from "../scripts/ci/travas.mjs";

type Arq = { filename: string; status: string; previous_filename?: string };
const roda = (arquivos: Arq[], base: Record<string, string>, head: Record<string, string>) =>
  classificar(arquivos, (sha: string, p: string) => (sha === "B" ? base : head)[p] ?? null, "B", "H").motivos as string[];

const wf = (corpo: string) => `name: x\non: workflow_dispatch\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n    steps:\n${corpo}`;

describe("scripts/ci/travas (escopo v2)", () => {
  it("gate, autonomo, migracao, scripts/ci e .claude/settings seguem protegidos", () => {
    for (const f of [
      ".github/workflows/gate.yml",
      ".github/workflows/autonomo.yml",
      ".github/workflows/migracao.yml",
      "scripts/ci/travas.mjs",
      ".claude/settings.json",
    ]) {
      assert.equal(roda([{ filename: f, status: "modified" }], {}, {}).length, 1, f);
    }
  });

  it("notify.sh, dependabot.yml, skills e config.toml deixam de ser protegidos", () => {
    for (const f of ["scripts/notify.sh", ".github/dependabot.yml", ".claude/skills/x/SKILL.md", "supabase/config.toml"]) {
      assert.deepEqual(roda([{ filename: f, status: "modified" }], {}, {}), [], f);
    }
  });

  it("workflow auxiliar: mudar um passo comum passa; mexer em secrets/permissions/environment trava", () => {
    const f = ".github/workflows/transcodificar.yml";
    const antes = wf("      - run: echo 1\n        env:\n          K: ${{ secrets.K }}\n");
    const a = { [f]: antes };
    const mod = [{ filename: f, status: "modified" }];
    assert.deepEqual(roda(mod, a, { [f]: antes.replace("echo 1", "echo 2") }), []);
    assert.equal(roda(mod, a, { [f]: antes.replace("secrets.K", "secrets.OUTRO") }).length, 1);
    assert.equal(roda(mod, a, { [f]: antes.replace("contents: read", "contents: write") }).length, 1);
    assert.equal(roda(mod, a, { [f]: antes.replace("    runs-on: x", "    environment: producao-db\n    runs-on: x") }).length, 1);
    assert.equal(roda(mod, a, { [f]: antes.replace("permissions:\n  contents: read\n", "") }).length, 1);
  });

  it("workflow novo sem nada sensível passa; com secret trava; removido com secret trava", () => {
    const f = ".github/workflows/novo.yml";
    assert.deepEqual(roda([{ filename: f, status: "added" }], {}, { [f]: wf("      - run: echo\n") }), []);
    assert.equal(roda([{ filename: f, status: "added" }], {}, { [f]: wf("      - run: echo ${{ secrets.X }}\n") }).length, 1);
    assert.equal(roda([{ filename: f, status: "removed" }], { [f]: wf("      - run: echo ${{ secrets.X }}\n") }, {}).length, 1);
  });

  it("CLAUDE.md: fora do bloco TRAVAS passa; dentro trava; migration existente trava", () => {
    const md = (t: string, fora = "a") => `${fora}\n<!-- TRAVAS:INICIO x -->\n${t}\n<!-- TRAVAS:FIM -->\n`;
    const mod = [{ filename: "CLAUDE.md", status: "modified" }];
    assert.deepEqual(roda(mod, { "CLAUDE.md": md("t") }, { "CLAUDE.md": md("t", "b") }), []);
    assert.equal(roda(mod, { "CLAUDE.md": md("t") }, { "CLAUDE.md": md("u") }).length, 1);
    assert.equal(roda([{ filename: "supabase/migrations/20260101000000_x.sql", status: "modified" }], {}, {}).length, 1);
  });

  it("a impressão sensível ignora comentários e é estável nos workflows reais", () => {
    const y = readFileSync(".github/workflows/worker-deploy.yml", "utf8");
    assert.deepEqual(sensiveis(y), sensiveis(y.replace(/^# .*$/m, "# outro comentário")));
    assert.ok(sensiveis(y).some((l: string) => l.includes("secrets.")));
  });
});
