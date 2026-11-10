import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getSupabasePublicKey, getSupabaseUrl } from "../lib/supabase/env.ts";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;
const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

describe("lib/supabase/env", () => {
  it("lança erro quando a URL está ausente", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.throws(() => getSupabaseUrl(), /NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("aceita a chave legada anon", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy";
    assert.equal(getSupabasePublicKey(), "legacy");
  });

  it("prioriza a chave publishable quando ambas existem", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "new";
    assert.equal(getSupabasePublicKey(), "new");
  });

  it("lança erro quando nenhuma chave pública existe", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.throws(() => getSupabasePublicKey(), /ANON_KEY/);
  });
});

describe("lib/env limpar", () => {
  it("aparta espaços e quebras de linha; vazio vira undefined", async () => {
    const { limpar } = await import("../lib/env.ts");
    assert.equal(limpar("  abc\n"), "abc");
    assert.equal(limpar("   "), undefined);
    assert.equal(limpar(undefined), undefined);
  });

  it("URL e chave do Supabase vêm sem espaços", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://x.supabase.co\n";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "  sb_publishable_x ";
    assert.equal(getSupabaseUrl(), "https://x.supabase.co");
    assert.equal(getSupabasePublicKey(), "sb_publishable_x");
  });
});
