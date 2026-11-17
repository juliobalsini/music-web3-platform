// Foto própria do perfil (#125): regras puras. A imagem fica em covers/<conta>/<uuid> (mesmo prefixo das capas);
// a chave vai nos metadados do login (`foto_propria`) e a URL pública é a rota do app, que redireciona ao bucket.

import { chaveCapaValida } from "../playlists/capa.ts";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CAMINHO = new RegExp(`^/api/perfil/(${UUID})/foto\\?v=(${UUID})$`);

/** A foto só pode apontar para um objeto da própria conta em covers/ (gerado pela rota de upload). */
export const chaveFotoValida = chaveCapaValida;

/** URL (relativa) da foto própria: o `v` é o uuid do arquivo, então foto nova = URL nova (sem cache velho). */
export function urlFotoPerfil(userId: string, key: string): string | null {
  if (!chaveFotoValida(key, userId)) return null;
  return `/api/perfil/${userId.toLowerCase()}/foto?v=${key.slice(key.lastIndexOf("/") + 1)}`;
}

/** Chave no bucket a partir dos parâmetros da rota pública (`null` se não for uma foto válida). */
export function chaveDaRota(id: string, v: string | null): string | null {
  if (!v) return null;
  const key = `covers/${id.toLowerCase()}/${v.toLowerCase()}`;
  return chaveFotoValida(key, id) ? key : null;
}

/**
 * Normaliza uma URL de foto própria (relativa ou absoluta, de qualquer host) para o caminho relativo da rota.
 * Qualquer outra coisa → `null`. Assim o host gravado no banco nunca vira destino de imagem.
 */
export function caminhoFotoPerfil(url: string | null | undefined): string | null {
  if (!url) return null;
  let caminho = url;
  if (!url.startsWith("/")) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return null;
      caminho = u.pathname + u.search;
    } catch {
      return null;
    }
  }
  return CAMINHO.test(caminho) ? caminho : null;
}

/** Foto exibida da conta: a própria (se houver) vence a do Google. */
export function fotoDaConta(meta: Record<string, unknown>, userId: string): string | null {
  const propria = typeof meta.foto_propria === "string" ? urlFotoPerfil(userId, meta.foto_propria) : null;
  if (propria) return propria;
  return typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("https://") ? meta.avatar_url : null;
}
