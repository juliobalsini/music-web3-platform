// Capa própria da playlist: regras puras (recorte quadrado, chave no bucket, URL com versão). Testáveis sem navegador.

/** Lado da capa gerada no navegador (px). 1000 px em JPEG fica bem abaixo do limite de 2 MB. */
export const LADO_CAPA = 1000;
export const ZOOM_MAX = 3;

/** Enquadramento: zoom ≥ 1 e deslocamento do centro da imagem em frações do lado do quadro. */
export type Enquadramento = { zoom: number; x: number; y: number };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)) || 0; // `|| 0`: nunca -0

/**
 * Mantém a imagem cobrindo todo o quadro: o deslocamento máximo é metade do que sobra da imagem
 * além do quadro (em frações do lado). Zoom fora de [1, ZOOM_MAX] é ajustado.
 */
export function limitarEnquadramento(w: number, h: number, e: Enquadramento): Enquadramento {
  const zoom = limitar(Number.isFinite(e.zoom) ? e.zoom : 1, 1, ZOOM_MAX);
  const menor = Math.min(w, h);
  const folgaX = ((w / menor) * zoom - 1) / 2;
  const folgaY = ((h / menor) * zoom - 1) / 2;
  return { zoom, x: limitar(e.x || 0, -folgaX, folgaX), y: limitar(e.y || 0, -folgaY, folgaY) };
}

/** Retângulo quadrado da imagem original que aparece no quadro (para `drawImage`). */
export function recorteQuadrado(w: number, h: number, e: Enquadramento): { sx: number; sy: number; lado: number } {
  const { zoom, x, y } = limitarEnquadramento(w, h, e);
  const lado = Math.min(w, h) / zoom;
  // 1 lado do quadro equivale a `lado` px da imagem; deslocar a imagem para a direita mostra mais da esquerda.
  const cx = w / 2 - x * lado;
  const cy = h / 2 - y * lado;
  return {
    sx: limitar(cx - lado / 2, 0, w - lado),
    sy: limitar(cy - lado / 2, 0, h - lado),
    lado,
  };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** A capa só pode apontar para um objeto da própria conta em covers/ (gerado pela rota de upload). */
export function chaveCapaValida(key: unknown, userId: string): key is string {
  return typeof key === "string" && new RegExp(`^covers/${userId.toLowerCase()}/${UUID}$`).test(key);
}

/** URL pública da capa (rota do app → redireciona ao proxy/bucket). `v` muda a cada capa nova (sem cache velho). */
export function urlCapaPlaylist(id: string, coverPath: string | null | undefined): string | null {
  if (!coverPath) return null;
  const v = coverPath.slice(coverPath.lastIndexOf("/") + 1, coverPath.lastIndexOf("/") + 9);
  return `/api/playlists/${id}/capa?v=${encodeURIComponent(v)}`;
}
