import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { agregarMetricas, type EscutaLinha, type FaixaResumo, type MetricaFaixa } from "./rules";

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
export async function metricasDoArtista(
  artistId: string,
): Promise<{ faixa: FaixaResumo; metrica: MetricaFaixa }[] | null> {
  try {
    const supabase = await createClient();
    const { data: faixas } = await supabase
      .from("tracks")
      .select("id,title")
      .eq("artist_id", artistId)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    const lista = (faixas ?? []) as FaixaResumo[];
    if (lista.length === 0) return [];
    const admin = createAdminClient();
    const { data: escutas, error } = await admin
      .from("listen_events")
      .select("track_id,is_valid,user_id")
      .in("track_id", lista.map((f) => f.id))
      .eq("is_valid", true)
      .limit(10000);
    if (error) return null;
    const mapa = agregarMetricas((escutas ?? []) as EscutaLinha[]);
    return lista.map((faixa) => ({
      faixa,
      metrica: mapa.get(faixa.id) ?? { trackId: faixa.id, escutas: 0, ouvintes: 0 },
    }));
  } catch {
    return null;
  }
}
