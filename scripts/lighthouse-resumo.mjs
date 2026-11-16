#!/usr/bin/env node
// Resumo do Lighthouse CI (issue #185) em Markdown: LCP, CLS e TBT por página contra o orçamento.
// Uso: node scripts/lighthouse-resumo.mjs [pasta] >> "$GITHUB_STEP_SUMMARY". Só lê arquivos locais; sai 0 sempre (aviso).
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ORCAMENTO = {
  "largest-contentful-paint": { rotulo: "LCP", max: 2500, fmt: (v) => `${(v / 1000).toFixed(2)} s` },
  "cumulative-layout-shift": { rotulo: "CLS", max: 0.1, fmt: (v) => v.toFixed(3) },
  "total-blocking-time": { rotulo: "TBT", max: 300, fmt: (v) => `${Math.round(v)} ms` },
};

export function linhas(relatorios) {
  return relatorios.map(({ url, lhr }) => {
    const caminho = new URL(url).pathname;
    const celulas = Object.entries(ORCAMENTO).map(([id, o]) => {
      const v = lhr.audits?.[id]?.numericValue;
      if (typeof v !== "number") return "—";
      return `${o.fmt(v)} ${v <= o.max ? "✅" : "⚠️"}`;
    });
    const perf = lhr.categories?.performance?.score;
    return { caminho, celulas, perf: typeof perf === "number" ? Math.round(perf * 100) : null };
  });
}

export function markdown(dados) {
  const cab = Object.values(ORCAMENTO).map((o) => o.rotulo);
  const out = [
    "### Lighthouse (celular, aviso)",
    "",
    `Orçamento: LCP ≤ 2,5 s · CLS ≤ 0,1 · TBT ≤ 300 ms. App compilado no CI (catálogo de demonstração), 1 execução por página.`,
    "",
    `| Página | Desempenho | ${cab.join(" | ")} |`,
    `|---|---|${cab.map(() => "---").join("|")}|`,
    ...dados.map((d) => `| \`${d.caminho}\` | ${d.perf ?? "—"} | ${d.celulas.join(" | ")} |`),
  ];
  return out.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pasta = process.argv[2] ?? ".lighthouseci/relatorios";
  try {
    const manifesto = JSON.parse(readFileSync(join(pasta, "manifest.json"), "utf8"));
    const rel = manifesto
      .filter((m) => m.isRepresentativeRun)
      .map((m) => ({ url: m.url, lhr: JSON.parse(readFileSync(m.jsonPath, "utf8")) }));
    process.stdout.write(markdown(linhas(rel)));
  } catch (e) {
    process.stdout.write(`### Lighthouse (celular, aviso)\n\nSem relatórios: ${e instanceof Error ? e.message : String(e)}\n`);
  }
}
