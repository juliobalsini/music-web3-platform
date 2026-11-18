import "server-only";

import { cache } from "react";

import { mesclar } from "@/lib/preferencias/rules";
import { PERFIS_DEMO } from "@/lib/radio/demo";
import { rotuloGenero } from "@/lib/radio/generos";
import type { FaixaListada } from "@/lib/radio/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { fotoSegura, storiesDeBio, type PerfilBio } from "./bio";
import type { Story } from "./rules";

type LinhaPerfil = { id: string; display_name: string | null; bio: string | null; avatar_url: string | null; deleted_at: string | null };

async function lerPerfis(ids: string[]): Promise<LinhaPerfil[]> {
  const colunas = "id,display_name,bio,avatar_url,deleted_at";
  try {
    const { data, error } = await createAdminClient().from("profiles").select(colunas).in("id", ids);
    if (!error) return (data ?? []) as LinhaPerfil[];
  } catch {
    /* sem service_role: tenta com a sessão (perfis são de leitura pública) */
  }
  try {
    const { data, error } = await (await createClient()).from("profiles").select(colunas).in("id", ids);
    if (!error) return (data ?? []) as LinhaPerfil[];
  } catch {
    /* sem banco */
  }
  return [];
}

/** Artistas que ocultaram o story de bio ou deixaram o perfil privado (preferência não é pública: só o servidor lê). */
async function ocultos(ids: string[]): Promise<Set<string>> {
  const r = new Set<string>();
  try {
    const { data } = await createAdminClient().from("user_settings").select("user_id,prefs").in("user_id", ids);
    for (const l of (data ?? []) as { user_id: string; prefs: unknown }[]) {
      const p = mesclar(l.prefs);
      if (!p.storyBio || !p.perfilPublico) r.add(l.user_id);
    }
  } catch {
    /* sem service_role (prévias): ninguém oculto */
  }
  return r;
}

/**
 * Stories de bio de todos os artistas com faixas publicadas no catálogo. Derivados a cada leitura (nada é gravado):
 * mudou foto, frase ou faixa mais ouvida → story novo. Falha → lista vazia (a Home nunca quebra por isso).
 */
export const carregarBios = cache(async (faixas: FaixaListada[]): Promise<Story[]> => {
  const ids = [...new Set(faixas.map((f) => f.artistId))];
  if (ids.length === 0) return [];
  const demo = ids.filter((id) => id in PERFIS_DEMO);
  const reais = ids.filter((id) => !(id in PERFIS_DEMO));
  const [linhas, escondidos] = reais.length > 0 ? await Promise.all([lerPerfis(reais), ocultos(reais)]) : [[], new Set<string>()];
  const nomes = new Map(faixas.map((f) => [f.artistId, f.artistName]));
  const perfis: PerfilBio[] = [
    ...linhas
      .filter((l) => !l.deleted_at)
      .map((l) => ({ id: l.id, nome: l.display_name ?? nomes.get(l.id) ?? null, foto: l.avatar_url, bio: l.bio, oculto: escondidos.has(l.id) })),
    ...demo.map((id) => ({ id, nome: nomes.get(id) ?? null, foto: PERFIS_DEMO[id].foto, bio: PERFIS_DEMO[id].bio, oculto: false })),
  ];
  const lista = faixas.map((f) => ({ id: f.id, artistId: f.artistId, genre: f.genre, plays: f.plays, createdAt: f.createdAt }));
  return storiesDeBio(perfis, lista, (g) => rotuloGenero(g) ?? null);
});

/** Fotos públicas (validadas por `fotoSegura`) de alguns perfis, para listas curtas. Falha → mapa vazio. */
export async function fotosDePerfis(ids: string[]): Promise<Map<string, string>> {
  const r = new Map<string, string>();
  const reais = ids.filter((id) => !(id in PERFIS_DEMO));
  for (const id of ids) {
    const f = id in PERFIS_DEMO ? PERFIS_DEMO[id].foto : null;
    if (f) r.set(id, f);
  }
  if (reais.length > 0) {
    for (const l of await lerPerfis(reais)) {
      const f = l.deleted_at ? null : fotoSegura(l.avatar_url);
      if (f) r.set(l.id, f);
    }
  }
  return r;
}
