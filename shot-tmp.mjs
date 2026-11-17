import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const tema of ["claro", "escuro"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => localStorage.setItem("radioon:prefs", JSON.stringify({ tema: t })), tema);
  const p = await ctx.newPage();
  for (const r of ["/", "/explorar", "/ajustes", "/entrar"]) {
    await p.goto("http://localhost:3100" + r, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `/tmp/prints/${tema}${r.replace(/\//g, "_") || "_"}.png` });
  }
}
await b.close();
