#!/usr/bin/env node
// Valida migrations contra uma allowlist ESTRITA de instruções aditivas.
// Arquivo protegido: o gate e o workflow "migracao" sempre executam a versão da main.
//
// Permitido (uma instrução por comando, sem "OR REPLACE"):
//   CREATE TABLE · CREATE [UNIQUE] INDEX · ALTER TABLE .. ADD COLUMN (anulável)
//   ALTER TABLE .. ENABLE ROW LEVEL SECURITY · CREATE POLICY
//   ALTER TYPE .. ADD VALUE · CREATE FUNCTION (sql/plpgsql) · CREATE [CONSTRAINT] TRIGGER
// Qualquer outra coisa é recusada (vira "⚠️ Ação necessária").
//
// Uso: node scripts/ci/validar-sql.mjs <arquivo.sql>...   (exit 1 se algum falhar)

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ID = String.raw`(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)`;
const QNAME = String.raw`${ID}(?:\.${ID})?`;
const TABLE = String.raw`ALTER TABLE (?:IF EXISTS )?(?:ONLY )?${QNAME}`;

const RULES = [
  { nome: "CREATE TABLE", re: new RegExp(String.raw`^CREATE TABLE (?:IF NOT EXISTS )?${QNAME} ?\(`, "i") },
  {
    nome: "CREATE INDEX",
    re: new RegExp(
      String.raw`^CREATE (?:UNIQUE )?INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?(?:${ID} )?ON (?:ONLY )?${QNAME}`,
      "i",
    ),
  },
  { nome: "ADD COLUMN", re: new RegExp(String.raw`^${TABLE} ADD COLUMN (?:IF NOT EXISTS )?${ID} `, "i"), check: checkAddColumn },
  { nome: "ENABLE RLS", re: new RegExp(String.raw`^${TABLE} ENABLE ROW LEVEL SECURITY$`, "i") },
  { nome: "CREATE POLICY", re: new RegExp(String.raw`^CREATE POLICY ${ID} ON ${QNAME}`, "i") },
  {
    nome: "ADD VALUE",
    re: new RegExp(String.raw`^ALTER TYPE ${QNAME} ADD VALUE (?:IF NOT EXISTS )?''(?: (?:BEFORE|AFTER) '')?$`, "i"),
  },
  { nome: "CREATE FUNCTION", re: new RegExp(String.raw`^CREATE FUNCTION ${QNAME} ?\(`, "i"), check: checkFunction },
  {
    nome: "CREATE TRIGGER",
    re: new RegExp(String.raw`^CREATE (?:CONSTRAINT )?TRIGGER ${ID} (?:BEFORE|AFTER|INSTEAD OF) `, "i"),
    check: checkTrigger,
  },
];

// Palavras proibidas dentro do corpo de funções (DDL, escrita destrutiva, SQL dinâmico).
const FORBIDDEN_BODY =
  /\b(DROP|DELETE|TRUNCATE|ALTER|GRANT|REVOKE|EXECUTE|COPY|CREATE|COMMIT|ROLLBACK|VACUUM|REINDEX|CLUSTER|SESSION_AUTHORIZATION|DBLINK\w*|LO_UNLINK|PG_TERMINATE_BACKEND|PG_CANCEL_BACKEND|PG_READ_\w+|PG_WRITE_\w+|PG_LS_\w+)\b|\bSET\s+ROLE\b/i;

function checkAddColumn(stmt) {
  if (hasTopLevelComma(stmt.skeleton)) return "ALTER TABLE com mais de uma ação";
  if (/\bNOT NULL\b/i.test(stmt.skeleton)) return "ADD COLUMN precisa ser anulável (sem NOT NULL)";
  if (/\bPRIMARY KEY\b/i.test(stmt.skeleton)) return "ADD COLUMN com PRIMARY KEY";
  return null;
}

function checkFunction(stmt) {
  const langs = [...stmt.skeleton.matchAll(/\bLANGUAGE\s+("?)(\w+)\1/gi)].map((m) => m[2].toLowerCase());
  if (langs.length === 0) return "CREATE FUNCTION sem LANGUAGE explícito";
  if (langs.some((l) => l !== "sql" && l !== "plpgsql")) return `linguagem não permitida: ${langs.join(", ")}`;
  if (/\bBEGIN ATOMIC\b/i.test(stmt.skeleton)) return "corpo BEGIN ATOMIC não permitido";
  // Sem REVOKE na allowlist, uma função SECURITY DEFINER ficaria exposta via RPC.
  if (/\bSECURITY DEFINER\b/i.test(stmt.skeleton)) return "SECURITY DEFINER exige revisão humana";
  for (const body of [...stmt.bodies, ...stmt.strings]) {
    const m = stripComments(body).match(FORBIDDEN_BODY);
    if (m) return `corpo da função contém "${m[0].toUpperCase()}"`;
  }
  return null;
}

function checkTrigger(stmt) {
  if (!/\bEXECUTE (?:FUNCTION|PROCEDURE) /i.test(stmt.skeleton)) return "CREATE TRIGGER sem EXECUTE FUNCTION";
  return null;
}

function hasTopLevelComma(s) {
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) return true;
  }
  return false;
}

function stripComments(sql) {
  try {
    return tokenize(sql).statements.map((s) => s.skeleton).join(" ; ");
  } catch {
    return sql; // corpo malformado: valida o texto bruto (mais restritivo)
  }
}

/**
 * Divide o SQL em comandos, removendo comentários. Para cada comando devolve:
 * - skeleton: texto com strings trocadas por '' e corpos $tag$ por $$, espaços colapsados;
 * - bodies: conteúdos dollar-quoted; strings: conteúdos de literais '...'.
 */
export function tokenize(sql) {
  const statements = [];
  let cur = { skeleton: "", bodies: [], strings: [] };
  let i = 0;
  const n = sql.length;
  const push = () => {
    const skeleton = cur.skeleton.replace(/\s+/g, " ").trim();
    if (skeleton) statements.push({ ...cur, skeleton });
    cur = { skeleton: "", bodies: [], strings: [] };
  };

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      while (i < n && sql[i] !== "\n") i++;
      cur.skeleton += " ";
    } else if (ch === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else i++;
      }
      if (depth > 0) throw new Error("comentário /* sem fechamento");
      cur.skeleton += " ";
    } else if (ch === "'") {
      const escaped = /[eE]$/.test(cur.skeleton) && !/[A-Za-z0-9_][eE]$/.test(cur.skeleton);
      let j = i + 1;
      let content = "";
      for (;;) {
        if (j >= n) throw new Error("string sem fechamento");
        if (escaped && sql[j] === "\\") {
          content += sql.slice(j, j + 2);
          j += 2;
        } else if (sql[j] === "'" && sql[j + 1] === "'") {
          content += "'";
          j += 2;
        } else if (sql[j] === "'") break;
        else content += sql[j++];
      }
      cur.strings.push(content);
      cur.skeleton += "''";
      i = j + 1;
    } else if (ch === '"') {
      const j = sql.indexOf('"', i + 1);
      if (j < 0) throw new Error("identificador sem fechamento");
      cur.skeleton += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "$" && !/[A-Za-z0-9_]$/.test(cur.skeleton)) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (!m) {
        cur.skeleton += ch;
        i++;
        continue;
      }
      const tag = m[0];
      const end = sql.indexOf(tag, i + tag.length);
      if (end < 0) throw new Error(`bloco ${tag} sem fechamento`);
      cur.bodies.push(sql.slice(i + tag.length, end));
      cur.skeleton += "$$";
      i = end + tag.length;
    } else if (ch === ";") {
      push();
      i++;
    } else {
      cur.skeleton += ch;
      i++;
    }
  }
  push();
  return { statements };
}

/** Retorna lista de erros (vazia = SQL aceito). */
export function validarSql(sql) {
  let statements;
  try {
    ({ statements } = tokenize(sql));
  } catch (e) {
    return [`SQL inválido: ${e.message}`];
  }
  const erros = [];
  statements.forEach((stmt, idx) => {
    const resumo = stmt.skeleton.slice(0, 80);
    const rule = RULES.find((r) => r.re.test(stmt.skeleton));
    if (!rule) {
      erros.push(`#${idx + 1} fora da allowlist: ${resumo}`);
      return;
    }
    const problema = rule.check?.(stmt);
    if (problema) erros.push(`#${idx + 1} ${rule.nome}: ${problema} — ${resumo}`);
  });
  // Regra inviolável 2: toda tabela nova precisa de RLS no mesmo arquivo.
  const norm = (name) => name.replace(/"/g, "").toLowerCase().replace(/^public\./, "");
  const criadas = statements
    .map((s) => new RegExp(String.raw`^CREATE TABLE (?:IF NOT EXISTS )?(${QNAME})`, "i").exec(s.skeleton))
    .filter(Boolean)
    .map((m) => norm(m[1]));
  const comRls = new Set(
    statements
      .map((s) => new RegExp(String.raw`^ALTER TABLE (?:IF EXISTS )?(?:ONLY )?(${QNAME}) ENABLE ROW LEVEL SECURITY$`, "i").exec(s.skeleton))
      .filter(Boolean)
      .map((m) => norm(m[1])),
  );
  for (const t of criadas) if (!comRls.has(t)) erros.push(`tabela ${t} criada sem ENABLE ROW LEVEL SECURITY`);
  return erros;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const files = process.argv.slice(2);
  let ok = true;
  for (const f of files) {
    const erros = validarSql(readFileSync(f, "utf8"));
    if (erros.length) {
      ok = false;
      console.log(`✗ ${f}`);
      for (const e of erros) console.log(`  - ${e}`);
    } else console.log(`✓ ${f}`);
  }
  process.exit(ok ? 0 : 1);
}
