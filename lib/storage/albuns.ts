// Regras puras do envio de álbum/EP (sem servidor; testáveis).
import { parseUploadInput, type UploadInput } from "./rules.ts";

export const MIN_FAIXAS_ALBUM = 2;
export const MAX_FAIXAS_ALBUM = 20;

export type AlbumInput = {
  title: string;
  kind: "album" | "ep";
  cover: UploadInput["cover"];
  genre: UploadInput["genre"];
  mood: UploadInput["mood"];
  /** Faixas na ordem do álbum (o nº da faixa é a posição + 1). */
  faixas: UploadInput[];
};

export function parseAlbumInput(raw: unknown): { ok: true; value: AlbumInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "corpo inválido" };
  const b = raw as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (title.length < 1 || title.length > 120) return { ok: false, error: "título do álbum inválido" };
  if (b.kind !== "album" && b.kind !== "ep") return { ok: false, error: "tipo inválido (álbum ou EP)" };
  if (!Array.isArray(b.faixas) || b.faixas.length < MIN_FAIXAS_ALBUM || b.faixas.length > MAX_FAIXAS_ALBUM) {
    return { ok: false, error: `envie de ${MIN_FAIXAS_ALBUM} a ${MAX_FAIXAS_ALBUM} faixas` };
  }
  const faixas: UploadInput[] = [];
  for (const f of b.faixas) {
    if (typeof f !== "object" || f === null) return { ok: false, error: "faixa inválida" };
    // Capa, gênero, clima, direitos e álbum são do conjunto: cada faixa herda.
    const r = parseUploadInput({
      ...(f as object),
      rightsConfirmed: b.rightsConfirmed,
      genre: b.genre,
      mood: b.mood,
      cover: b.cover ?? null,
      credits: { album: title },
    });
    if (!r.ok) return r;
    faixas.push(r.value);
  }
  return { ok: true, value: { title, kind: b.kind, cover: faixas[0].cover, genre: faixas[0].genre, mood: faixas[0].mood, faixas } };
}
