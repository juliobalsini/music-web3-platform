import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";

import { dadosDemo, demoAtivo } from "@/lib/radio/demo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { Story } from "./rules";

type Linha = {
  id: string; author_id: string; is_platform: boolean; body: string | null; image_key: string | null;
  track_id: string | null; clip_start: number | null; hidden: boolean; created_at: string;
};

const COLUNAS = "id,author_id,is_platform,body,image_key,track_id,clip_start,hidden,created_at";

export function paraStory(l: Linha, nomes: Map<string, string>): Story {
  return {
    id: l.id,
    authorId: l.author_id,
    authorName: l.is_platform ? "radioOn" : (nomes.get(l.author_id) ?? "Artista"),
    isPlatform: l.is_platform,
    body: l.body,
    hasImage: !!l.image_key,
    trackId: l.track_id,
    clipStart: l.clip_start,
    createdAt: l.created_at,
  };
}

export async function nomesDe(ids: string[]): Promise<Map<string, string>> {
  const nomes = new Map<string, string>();
  if (ids.length === 0) return nomes;
  try {
    const { data } = await createAdminClient().from("profiles").select("id,display_name").in("id", ids);
    for (const p of (data ?? []) as { id: string; display_name: string | null }[]) if (p.display_name) nomes.set(p.id, p.display_name);
  } catch {
    try {
      const { data } = await (await createClient()).from("profiles").select("id,display_name").in("id", ids);
      for (const p of (data ?? []) as { id: string; display_name: string | null }[]) if (p.display_name) nomes.set(p.id, p.display_name);
    } catch {
      /* sem nomes */
    }
  }
  return nomes;
}

/**
 * Stories públicos (não ocultos), mais recentes primeiro — ativos e arquivados (o perfil do autor
 * mostra os antigos). Falha ou tabela ausente → lista vazia: a Rádio nunca quebra por causa de stories.
 */
export const carregarStories = cache(async (): Promise<Story[]> => {
  await connection();
  let linhas: Linha[] = [];
  try {
    const { data, error } = await (await createClient()).from("stories").select(COLUNAS).eq("hidden", false).order("created_at", { ascending: false }).limit(200);
    if (error) console.error("[stories]", error.message);
    else linhas = (data ?? []) as Linha[];
  } catch {
    /* sem banco */
  }
  const semDemo = (await cookies()).has("radioon_sem_demo");
  const demo = demoAtivo() && !semDemo ? dadosDemo(Date.now()) : null;
  const todas = [...linhas, ...(demo?.stories ?? [])];
  const nomes = await nomesDe([...new Set(todas.filter((l) => !l.is_platform).map((l) => l.author_id))].filter((id) => !demo?.nomes.has(id)));
  for (const [k, v] of demo?.nomes ?? []) nomes.set(k, v);
  return todas.map((l) => paraStory(l, nomes)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
