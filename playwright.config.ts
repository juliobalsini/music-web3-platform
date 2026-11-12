import { defineConfig, devices } from "@playwright/test";

// Contrato com o gate (.github/workflows/gate.yml): `pnpm e2e` contra E2E_BASE_URL.
// Sem E2E_BASE_URL, sobe o app local (build de produção) em :3000.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const iphone = { ...devices["iPhone 14"] } as Partial<(typeof devices)[string]>;
delete iphone.defaultBrowserType;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    extraHTTPHeaders: bypass
      ? {
          "x-vercel-protection-bypass": bypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile-visual/ },
    // Fase C: emulação mobile (viewport e UA de iPhone e de Android médio) só para o teste visual.
    // Ambos usam Chromium (o gate só instala Chromium); o iPhone não roda WebKit real.
    { name: "iphone", use: { ...iphone, browserName: "chromium" }, testMatch: /mobile-visual/ },
    { name: "android", use: { ...devices["Pixel 7"] }, testMatch: /mobile-visual/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
