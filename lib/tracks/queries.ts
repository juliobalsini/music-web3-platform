import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { agregarMetricas, resumoArtista, type EscutaDatada, type FaixaResumo, type MetricaFaixa, type ResumoArtista } from "./rules";

/** Faixas publicadas mais recentes (RLS pública). Falha → lista vazia. */
export async function listarFaixasRecentes(limite = 20): Promise<FaixaResumo[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tracks")
      .select("id,title")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limite);
    return (data ?? []) as FaixaResumo[];
  } catch {
    return [];
  }
}

/**
 * Métricas das faixas do próprio artista. `artistId` vem da sessão (servidor);
 * service_role só lê escutas das faixas dele. Falha → null.
 */
export type PainelArtista = { faixas: { faixa: FaixaResumo; metrica: MetricaFaixa }[]; resumo: ResumoArtista };

export async function metricasDoArtista(artistId: string): Promise<PainelArtista | null> {
  try {
    const supabase = await createClient();
    const { data: faixas } = await supabase
      .from("tracks")
      .select("id,title")
      .eq("artist_id", artistId)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    const lista = (faixas ?? []) as FaixaResumo[];
    if (lista.length === 0) return { faixas: [], resumo: resumoArtista([], [], Date.now()) };
    const admin = createAdminClient();
    const { data: escutas, error } = await admin
      .from("listen_events")
      .select("track_id,is_valid,user_id,started_at")
      .in("track_id", lista.map((f) => f.id))
      .eq("is_valid", true)
      .order("started_at", { ascending: false })
      .limit(10000);
    if (error) return null;
    const linhas = (escutas ?? []) as EscutaDatada[];
    const mapa = agregarMetricas(linhas);
    return {
      faixas: lista.map((faixa) => ({ faixa, metrica: mapa.get(faixa.id) ?? { trackId: faixa.id, escutas: 0, ouvintes: 0 } })),
      resumo: resumoArtista(linhas, lista, Date.now()),
    };
  } catch {
    return null;
  }
}
