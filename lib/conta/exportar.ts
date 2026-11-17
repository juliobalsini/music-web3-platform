/**
 * Exportar meus dados (Configurações > Conta): o que entra no arquivo. Cada tabela é lida com a
 * sessão da própria pessoa (RLS) e filtrada pela coluna dona, para nunca levar linha de outra pessoa
 * que a RLS deixa ver (ex.: curtidas no próprio story, quem me segue).
 */
export const FONTES_EXPORTACAO = [
  { chave: "perfil", tabela: "profiles", dono: "id" },
  { chave: "preferencias", tabela: "user_settings", dono: "user_id" },
  { chave: "faixas", tabela: "tracks", dono: "artist_id" },
  { chave: "albuns", tabela: "albums", dono: "artist_id" },
  { chave: "playlists", tabela: "playlists", dono: "curator_id" },
  { chave: "playlistsSalvas", tabela: "playlist_saves", dono: "user_id" },
  { chave: "reacoes", tabela: "track_reactions", dono: "user_id" },
  { chave: "seguindo", tabela: "follows", dono: "follower_id" },
  { chave: "stories", tabela: "stories", dono: "author_id" },
  { chave: "comentariosEmStories", tabela: "story_comments", dono: "author_id" },
  { chave: "curtidasEmStories", tabela: "story_likes", dono: "user_id" },
  { chave: "escutas", tabela: "listen_events", dono: "user_id" },
  { chave: "pontos", tabela: "points_ledger", dono: "user_id" },
] as const;

/** Teto de linhas por tabela (um arquivo leve; escutas e pontos são os que crescem). */
export const MAX_LINHAS_EXPORTACAO = 5000;

/** Nome do arquivo: radioon-meus-dados-AAAA-MM-DD.json (data UTC). */
export function nomeArquivoExportacao(agora: Date): string {
  return `radioon-meus-dados-${agora.toISOString().slice(0, 10)}.json`;
}
