import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { demoAtivo, PERFIS_DEMO } from "@/lib/radio/demo";

/** Ids que a pessoa segue (RLS: cada conta vê só quem ela segue e quem a segue). Falha → lista vazia. */
export async function seguidosDe(supabase: SupabaseClient, userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("follows").select("followed_id").eq("follower_id", userId).limit(500);
    if (error) return [];
    return ((data ?? []) as { followed_id: string }[]).map((l) => l.followed_id);
  } catch {
    return [];
  }
}

/**
 * Só fora de produção, com o catálogo de demonstração: o cookie de teste `radioon_demo_segue` (ids separados por vírgula)
 * simula "sigo estes artistas demo" para o E2E (que não tem login). Ids fora da demonstração são ignorados.
 */
export async function seguidosDemo(): Promise<string[]> {
  if (!demoAtivo()) return [];
  const v = (await cookies()).get("radioon_demo_segue")?.value ?? "";
  return v.split(",").map((s) => s.trim()).filter((id) => id in PERFIS_DEMO);
}
