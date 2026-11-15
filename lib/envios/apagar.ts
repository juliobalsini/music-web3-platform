import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { diasRestantes, inicioJanela, TABELA, type TipoEnvio } from "./rules";

export type ResultadoEnvio = { ok: true } | { ok: false; erro: string };

/**
 * Exclusão lógica: marca deleted_at (sem DELETE). O dono vem SEMPRE da sessão do servidor e entra no filtro
 * da escrita, então ninguém apaga nem restaura o que não é seu. Álbum leva junto as faixas dele (mesma data,
 * para o desfazer devolver exatamente essas).
 */
export async function apagarEnvio(userId: string, tipo: TipoEnvio, id: string): Promise<ResultadoEnvio> {
  const { tabela, dono } = TABELA[tipo];
  const agora = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(tabela)
    .update({ deleted_at: agora })
    .eq("id", id)
    .eq(dono, userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: "Não foi possível apagar agora. Tente de novo." };
  if (!data) return { ok: false, erro: "Item não encontrado." };
  if (tipo === "album") {
    const { error: e2 } = await admin.from("tracks").update({ deleted_at: agora }).eq("album_id", id).eq("artist_id", userId).is("deleted_at", null);
    if (e2) console.error("[envios] faixas do álbum:", e2.message);
  }
  return { ok: true };
}

/** Desfaz um "Apagar" dentro de 30 dias. Fora do prazo, o item segue apagado. */
export async function desfazerEnvio(userId: string, tipo: TipoEnvio, id: string): Promise<ResultadoEnvio> {
  const { tabela, dono } = TABELA[tipo];
  const admin = createAdminClient();
  const { data: atual, error: e0 } = await admin.from(tabela).select("deleted_at").eq("id", id).eq(dono, userId).maybeSingle();
  if (e0) return { ok: false, erro: "Não foi possível desfazer agora. Tente de novo." };
  const quando = (atual as { deleted_at: string | null } | null)?.deleted_at;
  if (!quando) return { ok: false, erro: "Item não encontrado." };
  const { data, error } = await admin
    .from(tabela)
    .update({ deleted_at: null })
    .eq("id", id)
    .eq(dono, userId)
    .gte("deleted_at", inicioJanela())
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: "Não foi possível desfazer agora. Tente de novo." };
  if (!data) return { ok: false, erro: "O prazo de 30 dias para desfazer acabou." };
  if (tipo === "album") {
    const { error: e2 } = await admin.from("tracks").update({ deleted_at: null }).eq("album_id", id).eq("artist_id", userId).eq("deleted_at", quando);
    if (e2) console.error("[envios] faixas do álbum:", e2.message);
  }
  return { ok: true };
}

export type Apagado = { tipo: TipoEnvio; id: string; titulo: string; deletedAt: string; dias: number };

/**
 * O que o dono apagou e ainda pode desfazer. As leituras comuns não veem apagados (policy restritiva),
 * então esta lista vem do servidor, sempre filtrada pelo dono. Faixas que saíram junto com o álbum não
 * aparecem sozinhas (voltam com ele). Falha (ex.: sem service_role nas prévias) → lista vazia.
 */
export async function listarApagados(userId: string): Promise<Apagado[]> {
  try {
    const admin = createAdminClient();
    const desde = inicioJanela();
    const [f, a, p, s] = await Promise.all([
      admin.from("tracks").select("id,title,album_id,deleted_at").eq("artist_id", userId).gte("deleted_at", desde).limit(100),
      admin.from("albums").select("id,title,deleted_at").eq("artist_id", userId).gte("deleted_at", desde).limit(50),
      admin.from("playlists").select("id,title,deleted_at").eq("curator_id", userId).gte("deleted_at", desde).limit(50),
      admin.from("stories").select("id,body,deleted_at").eq("author_id", userId).gte("deleted_at", desde).limit(50),
    ]);
    const albuns = (a.data ?? []) as { id: string; title: string; deleted_at: string }[];
    const albumQuando = new Map(albuns.map((x) => [x.id, x.deleted_at]));
    const itens: Omit<Apagado, "dias">[] = [
      ...((f.data ?? []) as { id: string; title: string; album_id: string | null; deleted_at: string }[])
        .filter((t) => !(t.album_id && albumQuando.get(t.album_id) === t.deleted_at))
        .map((t) => ({ tipo: "faixa" as const, id: t.id, titulo: t.title, deletedAt: t.deleted_at })),
      ...albuns.map((x) => ({ tipo: "album" as const, id: x.id, titulo: x.title, deletedAt: x.deleted_at })),
      ...((p.data ?? []) as { id: string; title: string; deleted_at: string }[]).map((x) => ({ tipo: "playlist" as const, id: x.id, titulo: x.title, deletedAt: x.deleted_at })),
      ...((s.data ?? []) as { id: string; body: string | null; deleted_at: string }[]).map((x) => ({ tipo: "story" as const, id: x.id, titulo: x.body || "Story sem texto", deletedAt: x.deleted_at })),
    ];
    const agora = Date.now();
    return itens
      .map((x) => ({ ...x, dias: diasRestantes(x.deletedAt, agora) }))
      .sort((x, y) => y.deletedAt.localeCompare(x.deletedAt));
  } catch {
    return [];
  }
}

/** Renomear faixa ou álbum (só o dono, item não apagado). Álbum renomeia também o campo `album` das faixas dele. */
export async function renomearEnvio(userId: string, tipo: "faixa" | "album", id: string, titulo: string): Promise<ResultadoEnvio> {
  const { tabela, dono } = TABELA[tipo];
  const admin = createAdminClient();
  const { data, error } = await admin.from(tabela).update({ title: titulo }).eq("id", id).eq(dono, userId).is("deleted_at", null).select("id").maybeSingle();
  if (error) return { ok: false, erro: "Não foi possível salvar agora. Tente de novo." };
  if (!data) return { ok: false, erro: "Item não encontrado." };
  if (tipo === "album") {
    const { error: e2 } = await admin.from("tracks").update({ album: titulo.slice(0, 120) }).eq("album_id", id).eq("artist_id", userId);
    if (e2) console.error("[envios] nome do álbum nas faixas:", e2.message);
  }
  return { ok: true };
}
