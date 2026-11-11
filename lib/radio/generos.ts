// Listas fixas de gênero (independentes) e clima. `id` é o que vai para o banco.

export const GENEROS = [
  { id: "indie", label: "Indie" },
  { id: "rock", label: "Rock" },
  { id: "mpb", label: "MPB" },
  { id: "samba", label: "Samba" },
  { id: "pagode", label: "Pagode" },
  { id: "forro", label: "Forró" },
  { id: "funk", label: "Funk" },
  { id: "hip-hop", label: "Hip hop" },
  { id: "trap", label: "Trap" },
  { id: "pop", label: "Pop" },
  { id: "eletronica", label: "Eletrônica" },
  { id: "lo-fi", label: "Lo-fi" },
  { id: "jazz", label: "Jazz" },
  { id: "blues", label: "Blues" },
  { id: "reggae", label: "Reggae" },
  { id: "soul-rnb", label: "Soul e R&B" },
  { id: "folk", label: "Folk" },
  { id: "sertanejo", label: "Sertanejo" },
  { id: "bossa-nova", label: "Bossa nova" },
  { id: "instrumental", label: "Instrumental" },
  { id: "experimental", label: "Experimental" },
  { id: "punk", label: "Punk" },
  { id: "metal", label: "Metal" },
  { id: "gospel", label: "Gospel" },
  { id: "outro", label: "Outro" },
] as const;
export type GeneroId = (typeof GENEROS)[number]["id"];

export const CLIMAS = [
  { id: "madrugada", label: "Madrugada" },
  { id: "estrada", label: "Estrada" },
  { id: "foco", label: "Foco" },
  { id: "chuva", label: "Chuva" },
  { id: "pista", label: "Pista" },
  { id: "domingo", label: "Domingo" },
] as const;
export type ClimaId = (typeof CLIMAS)[number]["id"];

export const rotuloGenero = (id: string | null | undefined) => GENEROS.find((g) => g.id === id)?.label ?? null;
export const rotuloClima = (id: string | null | undefined) => CLIMAS.find((c) => c.id === id)?.label ?? null;

/** Valida um valor opcional contra a lista: vazio/ausente → null; fora da lista → undefined (inválido). */
export function lerGenero(v: unknown): GeneroId | null | undefined {
  if (v == null || v === "") return null;
  return GENEROS.find((g) => g.id === v)?.id;
}
export function lerClima(v: unknown): ClimaId | null | undefined {
  if (v == null || v === "") return null;
  return CLIMAS.find((c) => c.id === v)?.id;
}
