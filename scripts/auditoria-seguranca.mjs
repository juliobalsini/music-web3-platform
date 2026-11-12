#!/usr/bin/env node
// Auditoria de segurança estática do próprio repositório (somente leitura, sem rede, sem credenciais).
// Saída: Markdown para a seção "Segurança" do relatório. Nunca imprime valores de segredos (só arquivo:linha e tipo).
// Uso: node scripts/auditoria-seguranca.mjs [--json]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ach = []; // { sev, area, msg }
const add = (sev, area, msg) => ach.push({ sev, area, msg });
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }); } catch { return ""; } };
const ler = (p) => readFileSync(p, "utf8");
const andar = (dir, f = () => true, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) andar(p, f, acc);
    else if (f(p)) acc.push(p);
  }
  return acc;
};

// 1. Segredos no código e no histórico (padrões conhecidos; reporta só tipo e local).
const PADROES = [
  ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["chave AWS", /AKIA[0-9A-Z]{16}/],
  ["token GitHub", /gh[pousr]_[A-Za-z0-9]{30,}/],
  ["JWT (service_role?)", /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/],
  ["secret key Supabase", /sb_secret_[A-Za-z0-9_-]{20,}/],
  ["URL de banco com senha", /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]{4,}@/],
];
for (const f of sh("git", ["ls-files"]).split("\n").filter((x) => x && !/\.(png|jpg|ico|woff2?|lock)$/.test(x) && !/pnpm-lock/.test(x))) {
  if (/^tests\/|\.test\./.test(f)) continue;
  let t; try { t = ler(f); } catch { continue; }
  t.split("\n").forEach((l, i) => PADROES.forEach(([n, r]) => { if (r.test(l) && !/exemplo|example|fict[ií]cia|placeholder/i.test(l)) add("crítico", "segredos", `${n} em ${f}:${i + 1}`); }));
}
const hist = sh("git", ["log", "--all", "-p", "--no-color", "-G", "BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|sb_secret_[A-Za-z0-9_-]{20}|gh[pousr]_[A-Za-z0-9]{30}", "--format=commit %h", "--", ".", ":!pnpm-lock.yaml", ":!tests", ":!scripts/auditoria-seguranca.mjs"]);
if (hist.trim()) add("alto", "segredos", `Padrões de segredo no histórico do git (commits: ${[...new Set(hist.match(/^commit \w+/gm) ?? [])].slice(0, 5).map((x) => x.slice(7)).join(", ")}). Confirmar manualmente; rotação é do Julio.`);
if (sh("git", ["ls-files", ".env*"]).split("\n").some((x) => x && !/\.example$/.test(x))) add("crítico", "segredos", "Arquivo .env* versionado.");
const publicas = new Set();
for (const f of andar(".", (p) => /\.(tsx?|mjs)$/.test(p) && !p.startsWith("tests") && !p.startsWith("e2e")))
  for (const m of ler(f).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) publicas.add(m[0]);
const OK_PUBLICAS = /^NEXT_PUBLIC_(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY|AUDIO_BASE_URL|GOOGLE_LOGIN)$/;
for (const v of publicas) if (!OK_PUBLICAS.test(v) || /SECRET|SERVICE|PRIVATE|PASSWORD|S3_/.test(v)) add("alto", "env-publicas", `${v} é exposta ao navegador; confirmar que não é sensível.`);

// 2. RLS: toda tabela criada nas migrations precisa de ENABLE RLS e ao menos uma policy.
const mig = readdirSync("supabase/migrations").sort().map((n) => ler(join("supabase/migrations", n))).join("\n").replace(/--[^\n]*/g, "");
const tabelas = [...mig.matchAll(/create table (?:if not exists )?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1]);
for (const t of new Set(tabelas)) {
  if (!new RegExp(`alter table\\s+(?:public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`, "i").test(mig)) add("crítico", "rls", `Tabela ${t} sem ENABLE ROW LEVEL SECURITY nas migrations.`);
  if (!new RegExp(`create policy[^;]*on (?:public\\.)?"?${t}"?\\b`, "i").test(mig)) add("médio", "rls", `Tabela ${t} sem policy (acesso só via service_role; confirmar que é intencional).`);
  if (new RegExp(`grant[^;]*\\bto\\s+anon\\b[^;]*\\bon\\b[^;]*${t}|grant[^;]*on[^;]*\\b${t}\\b[^;]*to\\s+anon`, "i").test(mig)) add("baixo", "rls", `Tabela ${t} com GRANT explícito a anon; revisar contra a auditoria do PR #61 (tests/rls-anonimos.test.ts).`);
}

// 3. Rotas de API: exigem sessão/dono? Upload valida tipo, tamanho e caminho?
// Públicas de propósito (ouvinte anônimo toca faixas publicadas; a rota confere status=published e assina URL curta).
const PUBLICAS_OK = new Set(["app/api/health/route.ts", "app/api/tracks/[id]/play/route.ts", "app/api/tracks/[id]/capa/route.ts"]);
for (const f of andar("app/api", (p) => p.endsWith("route.ts"))) {
  const t = ler(f);
  if (!PUBLICAS_OK.has(f) && !/getUser|getSession|lib\/session|sessao|requireUser|exigir/i.test(t)) add("médio", "rotas", `${f} sem verificação de sessão aparente (confirmar se é pública de propósito).`);
  if (/upload/.test(f) && !/audio\/|image\/|ContentType|tipo/i.test(t)) add("alto", "upload", `${f} sem validação de tipo aparente.`);
  if (/upload/.test(f) && !/MAX|bytes|tamanho|size/i.test(t)) add("alto", "upload", `${f} sem limite de tamanho aparente.`);
}
for (const f of andar("app", (p) => /\.tsx?$/.test(p)))
  if (/^\s*["']use server["']/m.test(ler(f)) && !/getUser|getSession|sessao|exigir|requireUser|lib\/session/i.test(ler(f))) add("médio", "actions", `${f} tem server action sem verificação de sessão aparente.`);

// 4. Headers de segurança e CORS.
const cfg = ler("next.config.ts") + (existsSync("proxy.ts") ? ler("proxy.ts") : "");
for (const h of ["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Content-Security-Policy"])
  if (!new RegExp(h, "i").test(cfg)) add(h === "Content-Security-Policy" ? "médio" : "baixo", "headers", `${h} ausente em next.config.ts/proxy.ts.`);
const worker = existsSync("workers/audio-proxy/src/index.js") ? ler("workers/audio-proxy/src/index.js") : "";
if (/Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*/.test(worker)) add("médio", "cors", "Worker de áudio responde CORS com '*'.");
if (worker && !/nosniff/i.test(worker)) add("baixo", "cors", "Worker de áudio sem X-Content-Type-Options: nosniff.");

// 5. Workflows: permissions explícitas e escopo de secrets.
for (const f of andar(".github/workflows", (p) => p.endsWith(".yml"))) {
  const t = ler(f);
  if (!/^permissions:/m.test(t)) add("médio", "workflows", `${f} sem bloco permissions (GITHUB_TOKEN com padrão amplo).`);
  if (/permissions:[\s\S]{0,80}write-all/.test(t)) add("alto", "workflows", `${f} usa write-all.`);
  if (/pull_request_target/.test(t)) add("alto", "workflows", `${f} usa pull_request_target (revisar injeção).`);
  // Só conta uso direto em script (linha que não é um mapeamento "CHAVE: ${{ }}" de env).
  if (t.split("\n").some((l) => /\$\{\{\s*(github\.event\.(issue|pull_request|comment)\.(title|body)|github\.head_ref)/.test(l) && !/^\s*[A-Z_]+:\s*\$\{\{/.test(l))) add("alto", "workflows", `${f} interpola texto não confiável em run (injeção de comando).`);
  if (/uses:\s*[\w.-]+\/[\w.-]+@(main|master)\b/.test(t)) add("baixo", "workflows", `${f} usa action presa a branch.`);
}

const ordem = ["crítico", "alto", "médio", "baixo"];
ach.sort((a, b) => ordem.indexOf(a.sev) - ordem.indexOf(b.sev));
if (process.argv.includes("--json")) { console.log(JSON.stringify(ach, null, 2)); process.exit(0); }
console.log("## Segurança (auditoria estática)\n");
if (!ach.length) console.log("Nenhum achado nas verificações estáticas.");
for (const s of ordem) {
  const l = ach.filter((a) => a.sev === s);
  if (l.length) console.log(`**${s[0].toUpperCase() + s.slice(1)}** (${l.length})\n${l.map((a) => `- [${a.area}] ${a.msg}`).join("\n")}\n`);
}
console.log("_Não cobre: alertas Dependabot/CodeQL/secret scanning (o Julio já os recebe por e-mail; a auditoria não depende da API deles e não exige ampliar o PAT) nem RLS contra banco real (tests/rls-anonimos.test.ts)._");
process.exit(ach.some((a) => a.sev === "crítico") ? 2 : 0);
