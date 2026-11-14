#!/usr/bin/env node
// Verificação de segurança dos workflows (issue #102). Sem dependências: análise por linhas/regex
// do YAML, que neste repositório segue formatação regular. Em caso de dúvida, falha (seguro).
//
// Regras (cada violação reprova o gate):
//  R1  workflow disparado por `issues`/`issue_comment` exige, em TODO job sem `needs` (e nos
//      demais que usem always()/cancelled()), um `if:` de job que compare o autor
//      (github.event.issue.user.login / github.event.comment.user.login) com 'juliobalsini'.
//  R2  github.event.issue.title/body, comment.body, head_ref (e campos equivalentes de texto livre)
//      nunca aparecem dentro de `run:` ou `script:` — só via `env:`.
//  R3  proibido `pull_request_target`, `permissions: write-all` e `cancel-in-progress` ligado em
//      workflow que pode ter execução esperando aprovação (issues/issue_comment/schedule/dispatch
//      ou job com `environment:`). Exceção: workflow só de `pull_request` — um novo commit no
//      mesmo PR invalida a aprovação anterior, então cancelar é o comportamento correto.
//
// Uso: node scripts/ci/verificar-workflows.mjs [diretório=.github/workflows]

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const AUTOR = "juliobalsini";
const PERIGOSOS = [
  /github\.event\.issue\.title/,
  /github\.event\.issue\.body/,
  /github\.event\.comment\.body/,
  /github\.event\.review\.body/,
  /github\.event\.review_comment\.body/,
  /github\.event\.pull_request\.title/,
  /github\.event\.pull_request\.body/,
  /github\.event\.pull_request\.head\.ref/,
  /github\.event\.pull_request\.head\.label/,
  /github\.event\.head_commit\.message/,
  /github\.head_ref/,
];

const indent = (l) => l.length - l.trimStart().length;
const semComentario = (t) =>
  t
    .split("\n")
    .map((l) => (/^\s*#/.test(l) ? "" : l.replace(/\s+#.*$/, "")))
    .join("\n");

// Eventos do bloco `on:` (formas bloco, fluxo `on: [a, b]` e `on: a`).
function gatilhos(linhas) {
  const i = linhas.findIndex((l) => /^["']?on["']?\s*:/.test(l));
  if (i < 0) return new Set();
  const resto = linhas[i].replace(/^["']?on["']?\s*:/, "").trim();
  const ev = new Set();
  if (resto) {
    for (const m of resto.matchAll(/[a-z_]+/g)) ev.add(m[0]);
    return ev;
  }
  for (let j = i + 1; j < linhas.length; j++) {
    const l = linhas[j];
    if (!l.trim()) continue;
    if (indent(l) === 0) break;
    const m = /^\s{2}([a-z_]+)\s*:/.exec(l) ?? /^\s{2}-\s*([a-z_]+)/.exec(l);
    if (m && indent(l) === 2) ev.add(m[1]);
  }
  return ev;
}

// Jobs: chave de 2 espaços sob `jobs:`; devolve {nome, linhas}.
function jobs(linhas) {
  const i = linhas.findIndex((l) => /^jobs\s*:/.test(l));
  if (i < 0) return [];
  const out = [];
  let atual = null;
  for (let j = i + 1; j < linhas.length; j++) {
    const l = linhas[j];
    if (!l.trim()) continue;
    if (indent(l) === 0) break;
    const m = /^ {2}([\w-]+)\s*:/.exec(l);
    if (m) {
      atual = { nome: m[1], linhas: [] };
      out.push(atual);
    } else if (atual) atual.linhas.push(l);
  }
  return out;
}

// Valor de uma chave de job (indent 4), incluindo continuação em várias linhas.
function valorChave(job, chave) {
  const re = new RegExp(`^ {4}${chave}\\s*:(.*)$`);
  const i = job.linhas.findIndex((l) => re.test(l));
  if (i < 0) return null;
  let v = re.exec(job.linhas[i])[1];
  for (let j = i + 1; j < job.linhas.length && indent(job.linhas[j]) > 4; j++) v += " " + job.linhas[j].trim();
  return v;
}

// Blocos `run:`/`script:`: texto inline ou bloco indentado.
function blocosDeCodigo(linhas) {
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = /^(\s*)(?:-\s+)?(run|script)\s*:(.*)$/.exec(linhas[i]);
    if (!m) continue;
    const base = m[1].length + (/^\s*-\s/.test(linhas[i]) ? 2 : 0);
    let texto = m[3];
    for (let j = i + 1; j < linhas.length; j++) {
      if (linhas[j].trim() && indent(linhas[j]) <= base) break;
      texto += "\n" + linhas[j];
    }
    out.push({ linha: i + 1, texto });
  }
  return out;
}

export function verificarWorkflow(nome, conteudo) {
  const erros = [];
  const linhas = semComentario(conteudo).split("\n");
  const ev = gatilhos(linhas);
  const lista = jobs(linhas);
  const temEnvironment = lista.some((j) => valorChave(j, "environment") !== null);

  // R1
  const exige = [];
  if (ev.has("issues")) exige.push("github.event.issue.user.login");
  if (ev.has("issue_comment")) exige.push("github.event.comment.user.login");
  if (exige.length) {
    for (const j of lista) {
      const cond = valorChave(j, "if");
      const depende = valorChave(j, "needs") !== null;
      const furaCadeia = cond !== null && /\b(always|cancelled)\s*\(/.test(cond);
      if (depende && !furaCadeia) continue; // pulado junto com o job de que depende
      const ok = cond !== null && exige.every((c) => cond.includes(c)) && cond.includes(`'${AUTOR}'`);
      if (!ok) erros.push(`R1 ${nome}: job "${j.nome}" não checa ${exige.join(" e ")} == '${AUTOR}' no if do job`);
    }
  }

  // R2
  for (const b of blocosDeCodigo(linhas)) {
    for (const expr of b.texto.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
      const p = PERIGOSOS.find((re) => re.test(expr[1]));
      if (p) erros.push(`R2 ${nome}:${b.linha}: \${{${expr[1]}}} interpolado em run/script (use env:)`);
    }
  }

  // R3
  if (ev.has("pull_request_target")) erros.push(`R3 ${nome}: usa pull_request_target`);
  const texto = linhas.join("\n");
  if (/permissions\s*:\s*write-all/.test(texto)) erros.push(`R3 ${nome}: permissions write-all`);
  const cancela = [...texto.matchAll(/cancel-in-progress\s*:\s*([^\n,}]+)/g)].some((m) => m[1].trim() !== "false");
  if (cancela) {
    const somentePR = ev.size > 0 && [...ev].every((e) => e === "pull_request");
    const arriscado =
      ["issues", "issue_comment", "schedule", "workflow_dispatch", "repository_dispatch"].some((e) => ev.has(e)) ||
      (temEnvironment && !somentePR);
    if (arriscado) erros.push(`R3 ${nome}: concurrency com cancel-in-progress em workflow que pode esperar aprovação`);
  }
  return erros;
}

export function verificarDiretorio(dir) {
  const erros = [];
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).sort()) {
    erros.push(...verificarWorkflow(f, readFileSync(join(dir, f), "utf8")));
  }
  return erros;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dir = process.argv[2] ?? ".github/workflows";
  const erros = verificarDiretorio(dir);
  if (erros.length) {
    for (const e of erros) console.error(`::error::${e}`);
    console.error(`${erros.length} violação(ões) nos workflows.`);
    process.exit(1);
  }
  console.log(`Workflows de ${dir}: sem violações (R1–R3).`);
}
