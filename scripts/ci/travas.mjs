#!/usr/bin/env node
// Classifica um PR: altera arquivos protegidos? Tem migrations novas válidas?
// Arquivo protegido: o gate sempre executa a versão da main (checkout do base.sha).
//
// Entradas (env):
//   ARQUIVOS  caminho de um JSONL com {filename, status, previous_filename} por linha
//             (saída de: gh api --paginate repos/R/pulls/N/files)
//   BASE_SHA, HEAD_SHA  commits disponíveis no checkout local
//   MOTIVOS   caminho onde gravar os motivos (markdown)
// Saídas (GITHUB_OUTPUT): protegido=true|false, migracoes=true|false

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

import { validarSql } from "./validar-sql.mjs";

const PROTEGIDOS = [
  /^\.github\//, // gate, autonomo, migracao, notify, ci
  /^\.claude\//,
  /^scripts\/notify\.sh$/,
  /^scripts\/ci\//,
  /^supabase\/config\.toml$/,
];
const MIGRATION = /^supabase\/migrations\//;
const MIGRATION_NOME = /^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/;
const TRAVAS = /<!-- TRAVAS:INICIO[^>]*-->([\s\S]*?)<!-- TRAVAS:FIM -->/;

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

const motivos = [];
let migracoes = false;

for (const { filename, status, previous_filename: anterior } of arquivos) {
  for (const p of [filename, anterior].filter(Boolean)) {
    if (PROTEGIDOS.some((re) => re.test(p))) motivos.push(`\`${p}\` é arquivo protegido (${status})`);
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

const protegido = motivos.length > 0;
const texto = protegido ? motivos.map((m) => `- ${m}`).join("\n") : "Nenhum arquivo protegido alterado.";
console.log(texto);
if (MOTIVOS) writeFileSync(MOTIVOS, texto + "\n");
if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `protegido=${protegido}\nmigracoes=${migracoes}\n`);
