// Regras puras de Stories (sem servidor; testáveis).

export const DIA_MS = 24 * 3600 * 1000;
/** Quanto tempo o story fica na faixa de stories da home; depois só no perfil do autor. */
export const ATIVO_MS = 7 * DIA_MS;
export const CLIP_SEGUNDOS = 15;
export const MAX_TEXTO = 280;
/** Denúncias distintas (de contas) para ocultar automaticamente. */
export const LIMITE_DENUNCIAS = 3;
export const MAX_IMAGEM_BYTES = 1_500_000;
export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"] as const;

export type Story = {
  id: string;
  authorId: string;
  /** Nome do autor ("radioOn" nos stories da plataforma). */
  authorName: string;
  isPlatform: boolean;
  body: string | null;
  hasImage: boolean;
  trackId: string | null;
  clipStart: number | null;
  createdAt: string;
};

export const ativo = (createdAt: string, agora: number) => agora - Date.parse(createdAt) < ATIVO_MS;

/** Dias restantes (arredondado para cima) até o story sair da faixa da home. */
export const diasRestantes = (createdAt: string, agora: number) => Math.max(0, Math.ceil((Date.parse(createdAt) + ATIVO_MS - agora) / DIA_MS));

/** Ativos mais recentes primeiro; no máx. `limite`. */
export function storiesAtivos(stories: Story[], agora: number, limite = 40): Story[] {
  return stories
    .filter((s) => ativo(s.createdAt, agora))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limite);
}

export type GrupoStories = { authorId: string; authorName: string; isPlatform: boolean; stories: Story[] };

/** Agrupa por autor (como a faixa de círculos); ordem de cada grupo cronológica, grupos pelo mais recente. */
export function agruparPorAutor(stories: Story[]): GrupoStories[] {
  const m = new Map<string, GrupoStories>();
  for (const s of [...stories].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const g = m.get(s.authorId) ?? { authorId: s.authorId, authorName: s.authorName, isPlatform: s.isPlatform, stories: [] };
    g.stories.push(s);
    m.set(s.authorId, g);
  }
  return [...m.values()].map((g) => ({ ...g, stories: g.stories.reverse() }));
}

export type StoryInput = { body: string | null; image: { contentType: string; size: number } | null; trackId: string | null; clipStart: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Valida o corpo do pedido: precisa de texto, imagem ou trecho; trecho exige faixa. */
export function parseStoryInput(raw: unknown): { ok: true; value: StoryInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "corpo inválido" };
  const b = raw as Record<string, unknown>;
  let body: string | null = null;
  if (b.body != null && b.body !== "") {
    if (typeof b.body !== "string") return { ok: false, error: "texto inválido" };
    const t = b.body.trim();
    if (t.length > MAX_TEXTO) return { ok: false, error: `texto de até ${MAX_TEXTO} caracteres` };
    body = t || null;
  }
  let image: StoryInput["image"] = null;
  if (b.image != null) {
    const i = b.image as Record<string, unknown>;
    if (typeof i !== "object" || typeof i.contentType !== "string" || !(TIPOS_IMAGEM as readonly string[]).includes(i.contentType)) return { ok: false, error: "formato de imagem não aceito" };
    if (typeof i.size !== "number" || !Number.isInteger(i.size) || i.size <= 0 || i.size > MAX_IMAGEM_BYTES) return { ok: false, error: "imagem vazia ou maior que 1,5 MB" };
    image = { contentType: i.contentType, size: i.size };
  }
  let trackId: string | null = null;
  if (b.trackId != null && b.trackId !== "") {
    if (typeof b.trackId !== "string" || !UUID.test(b.trackId)) return { ok: false, error: "faixa inválida" };
    trackId = b.trackId;
  }
  let clipStart: number | null = null;
  if (trackId) {
    const c = b.clipStart == null || b.clipStart === "" ? 0 : Number(b.clipStart);
    if (!Number.isInteger(c) || c < 0 || c > 7200) return { ok: false, error: "início do trecho inválido" };
    clipStart = c;
  }
  if (!body && !image && !trackId) return { ok: false, error: "escreva um texto, escolha uma imagem ou uma faixa" };
  return { ok: true, value: { body, image, trackId, clipStart } };
}

/** Início do trecho ajustado para caber na duração conhecida da faixa (trecho de até 15 s). */
export function inicioDoTrecho(clipStart: number | null, duracao: number | null): number {
  const c = Math.max(0, clipStart ?? 0);
  if (!duracao || duracao <= CLIP_SEGUNDOS) return 0;
  return Math.min(c, duracao - CLIP_SEGUNDOS);
}

/** Ocultar quando o nº de denunciantes distintos chega ao limite. */
export const deveOcultar = (denunciantesDistintos: number) => denunciantesDistintos >= LIMITE_DENUNCIAS;

/** Quem publica: artistas, playlisters (curator) e contas da plataforma (lista em PLATFORM_STORY_IDS). */
export function podePublicarStory(role: string | null, userId: string, plataformaIds: string[]): { pode: boolean; plataforma: boolean } {
  const plataforma = plataformaIds.includes(userId);
  return { pode: plataforma || role === "artist" || role === "curator", plataforma };
}

export const idsDaPlataforma = (env: string | undefined) => (env ?? "").split(",").map((s) => s.trim()).filter((s) => UUID.test(s));

/** Links de compartilhamento do story (Instagram não tem link web: usa o cartão salvo). */
export function linksCompartilhar(url: string, texto: string) {
  const u = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
}

export const chaveImagemStory = (autorId: string, storyId: string) => `stories/${autorId}/${storyId}`;
