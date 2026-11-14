import "server-only";

import { revalidateTag } from "next/cache";

/** Tag do cache do catálogo público (faixas, playlists, programas, álbuns, nomes e contagens) da Rádio. */
export const TAG_CATALOGO = "catalogo";

/**
 * Marca o catálogo como desatualizado depois de uma escrita (publicar, editar playlist, programa, perfil).
 * `expire: 0`: a próxima leitura busca de novo (quem acabou de publicar vê na hora). Sem isso, o cache vale 60 s.
 */
export function catalogoMudou() {
  try {
    revalidateTag(TAG_CATALOGO, { expire: 0 });
  } catch {
    // Fora de uma requisição (testes): nada a invalidar.
  }
}
