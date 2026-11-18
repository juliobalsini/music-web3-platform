import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Contagem por id (só leitura). */
export type Contagens = Map<string, number>;
export type NumerosEnvios = { reproducoes: Contagens; salvamentosFaixa: Contagens; salvamentosPlaylist: Contagens; visualizacoes: Contagens };

const LIMITE = 20000;

function contar(linhas: Record<string, unknown>[] | null | undefined, coluna: string): Contagens {
  const m: Contagens = new Map();
  for (const l of linhas ?? []) {
    const id = l[coluna];
    if (typeof id === "string") m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

/**
 * Números dos envios do próprio usuário (Meus envios): reproduções válidas e salvamentos das faixas,
 * salvamentos das playlists e visualizações dos stories. Os ids vêm das listas já filtradas pelo dono
 * (cliente da sessão); service_role só lê. Falha → mapas vazios (a tela mostra zero, não quebra).
 */
export async function numerosDosEnvios(ids: { faixas: string[]; playlists: string[]; stories: string[] }): Promise<NumerosEnvios> {
  const vazio: NumerosEnvios = { reproducoes: new Map(), salvamentosFaixa: new Map(), salvamentosPlaylist: new Map(), visualizacoes: new Map() };
  try {
    const admin = createAdminClient();
    const nada = Promise.resolve({ data: [] as Record<string, unknown>[] });
    const [escutas, salvasF, salvasP, vistas] = await Promise.all([
      ids.faixas.length ? admin.from("listen_events").select("track_id").in("track_id", ids.faixas).eq("is_valid", true).limit(LIMITE) : nada,
      ids.faixas.length ? admin.from("track_reactions").select("track_id").in("track_id", ids.faixas).eq("kind", "save").limit(LIMITE) : nada,
      ids.playlists.length ? admin.from("playlist_saves").select("playlist_id").in("playlist_id", ids.playlists).limit(LIMITE) : nada,
      ids.stories.length ? admin.from("story_views").select("story_id").in("story_id", ids.stories).limit(LIMITE) : nada,
    ]);
    return {
      reproducoes: contar(escutas.data, "track_id"),
      salvamentosFaixa: contar(salvasF.data, "track_id"),
      salvamentosPlaylist: contar(salvasP.data, "playlist_id"),
      visualizacoes: contar(vistas.data, "story_id"),
    };
  } catch {
    return vazio;
  }
}
