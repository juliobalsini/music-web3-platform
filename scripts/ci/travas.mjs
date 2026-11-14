#!/usr/bin/env node
// Classifica um PR: altera arquivos protegidos? Tem migrations novas válidas?
// Arquivo protegido: o gate sempre executa a versão da main (checkout do base.sha).
//
// Escopo da trava (modelo operacional v2, issue #103; DECISIONS 94):
//  - bloco TRAVAS do CLAUDE.md;
//  - workflows do gate e do agente (gate.yml, autonomo.yml) e o de migrations (migracao.yml, que escreve no banco);
//  - scripts/ci/** (a lógica do próprio gate: travas, verificação de workflows, allowlist de SQL);
//  - .claude/settings*.json (permissões e hooks que rodam comandos);
//  - migrations já existentes (só migrations novas, válidas pela allowlist);
//  - em QUALQUER outro workflow: permissions, secrets, environment ou tokens alterados, workflow novo ou removido
//    que use algum deles, ou sem `permissions:` no topo.
// O resto (dependabot.yml, notify.sh, transcodificar.yml/worker-deploy.yml sem mudança sensível, skills) não é
// protegido e fica coberto pela verificação R1–R4 de scripts/ci/verificar-workflows.mjs.
//
// Entradas (env):
//   ARQUIVOS  caminho de um JSONL com {filename, status, previous_filename} por linha
//             (saída de: gh api --paginate repos/R/pulls/N/files)
//   BASE_SHA, HEAD_SHA  commits disponíveis no checkout local
//   MOTIVOS   caminho onde gravar os motivos (markdown)
// Saídas (GITHUB_OUTPUT): protegido=true|false, migracoes=true|false

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { validarSql } from "./validar-sql.mjs";

const PROTEGIDOS = [
  /^\.github\/workflows\/(gate|autonomo|migracao)\.ya?ml$/,
  /^scripts\/ci\//,
  /^\.claude\/settings[^/]*\.json$/,
];
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const MIGRATION = /^supabase\/migrations\//;
const MIGRATION_NOME = /^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/;
const TRAVAS = /<!-- TRAVAS:INICIO[^>]*-->([\s\S]*?)<!-- TRAVAS:FIM -->/;

const indent = (l) => l.length - l.trimStart().length;

/**
 * "Impressão digital" sensível de um workflow: blocos `permissions:`/`environment:` (com filhos) e toda linha que
 * cite secrets ou tokens. Comentários e espaços não contam. Duas versões com a mesma lista = nada sensível mudou.
 */
export function sensiveis(yaml) {
  const linhas = (yaml ?? "").split("\n").map((l) => (/^\s*#/.test(l) ? "" : l.replace(/\s+#.*$/, "").trimEnd()));
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.trim()) continue;
    if (/^\s*(-\s+)?(permissions|environment)\s*:/.test(l)) {
      const base = indent(l);
      const bloco = [l.trim()];
      for (let j = i + 1; j < linhas.length && (!linhas[j].trim() || indent(linhas[j]) > base); j++) {
        if (linhas[j].trim()) bloco.push(linhas[j].trim());
      }
      out.push(bloco.join(" "));
    }
    if (/secrets\s*[.[]|github\.token|GITHUB_TOKEN|GH_TOKEN|_PAT\b|TOKEN\s*:/.test(l)) out.push(l.trim());
  }
  return out.sort();
}

const temPermissoesNoTopo = (yaml) => /^permissions\s*:/m.test(yaml ?? "");

/**
 * Motivos de trava de um PR. `show(sha, caminho)` devolve o conteúdo do arquivo no commit (ou null).
 * Devolve { motivos, migracoes }.
 */
export function classificar(arquivos, show, BASE_SHA, HEAD_SHA) {
  const motivos = [];
  let migracoes = false;

  for (const { filename, status, previous_filename: anterior } of arquivos) {
    for (const p of [filename, anterior].filter(Boolean)) {
      if (PROTEGIDOS.some((re) => re.test(p))) motivos.push(`\`${p}\` é arquivo protegido (${status})`);
    }

    // Demais workflows: só mudanças sensíveis exigem a trava.
    const caminhos = [filename, anterior].filter(Boolean);
    if (caminhos.some((p) => WORKFLOW.test(p)) && !caminhos.some((p) => PROTEGIDOS.some((re) => re.test(p)))) {
      const antes = status === "added" ? null : show(BASE_SHA, anterior ?? filename);
      const depois = status === "removed" ? null : show(HEAD_SHA, filename);
      const sAntes = sensiveis(antes);
      // Workflow novo: um `permissions:` só de leitura não amplia acesso (e é obrigatório, ver abaixo).
      const sDepois = sensiveis(depois).filter((e) => !(status === "added" && /^permissions\s*:/.test(e) && !/write/.test(e)));
      if (depois !== null && !temPermissoesNoTopo(depois)) {
        motivos.push(`\`${filename}\`: workflow sem \`permissions:\` no topo`);
      } else if (JSON.stringify(sAntes) !== JSON.stringify(sDepois)) {
        motivos.push(`\`${filename}\`: permissions/secrets/environment/tokens alterados (${status})`);
      }
    }

    if (MIGRATION.test(filename) || (anterior && MIGRATION.test(anterior))) {
      if (status !== "added") {
        motivos.push(`\`${filename}\`: migration existente ${status} (só migrations novas são permitidas)`);
      } else if (!MIGRATION_NOME.test(filename)) {
        motivos.push(`\`${filename}\`: nome fora do padrão AAAAMMDDHHMMSS_nome.sql`);
      } else {
        migracoes = true; // o workflow "migracao" revalida antes de aplicar
        const sql = show(HEAD_SHA, filename);
        const erros = sql === null ? ["não foi possível ler o arquivo"] : validarSql(sql);
        if (erros.length) motivos.push(`\`${filename}\` fora da allowlist:\n${erros.map((e) => `  - ${e}`).join("\n")}`);
      }
    }

    if (filename === "CLAUDE.md" || anterior === "CLAUDE.md") {
      const antes = show(BASE_SHA, "CLAUDE.md")?.match(TRAVAS)?.[1];
      const depois = status === "removed" ? undefined : show(HEAD_SHA, "CLAUDE.md")?.match(TRAVAS)?.[1];
      if (antes === undefined || depois === undefined || antes.trim() !== depois.trim()) {
        motivos.push("`CLAUDE.md`: seção de travas alterada ou removida");
      }
    }
  }
  return { motivos, migracoes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { ARQUIVOS, BASE_SHA, HEAD_SHA, MOTIVOS, GITHUB_OUTPUT } = process.env;
  if (!ARQUIVOS || !BASE_SHA || !HEAD_SHA) {
    console.error("faltam ARQUIVOS, BASE_SHA ou HEAD_SHA");
    process.exit(2);
  }
  const show = (sha, path) => {
    try {
      return execFileSync("git", ["show", `${sha}:${path}`], { encoding: "utf8", maxBuffer: 20 << 20 });
    } catch {
      return null;
    }
  };
  const arquivos = readFileSync(ARQUIVOS, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const { motivos, migracoes } = classificar(arquivos, show, BASE_SHA, HEAD_SHA);
  const protegido = motivos.length > 0;
  const texto = protegido ? motivos.map((m) => `- ${m}`).join("\n") : "Nenhum arquivo protegido alterado.";
  console.log(texto);
  if (MOTIVOS) writeFileSync(MOTIVOS, texto + "\n");
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `protegido=${protegido}\nmigracoes=${migracoes}\n`);
}
