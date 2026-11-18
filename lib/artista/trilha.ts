// Trilha do artista (#147): primeiros passos depois do primeiro envio. Regras puras.
// Os passos vêm do servidor (perfil, faixas, stories, playlists); "compartilhar" fica no aparelho (localStorage).

export type PassoId = "perfil" | "segunda" | "story" | "compartilhar" | "playlist";

export type Passo = { id: PassoId; titulo: string; selo: string; feito: boolean };

/** Chave no aparelho: o artista já compartilhou o cartão de uma faixa. */
export const CHAVE_COMPARTILHOU = "radioon_trilha_compartilhou";

const PASSOS: { id: PassoId; titulo: string; selo: string }[] = [
  { id: "perfil", titulo: "Complete o perfil com foto e frase", selo: "Perfil completo" },
  { id: "segunda", titulo: "Envie a segunda faixa", selo: "Segunda faixa" },
  { id: "story", titulo: "Publique um story com trecho", selo: "Primeiro trecho" },
  { id: "compartilhar", titulo: "Compartilhe o cartão da faixa", selo: "Divulgador" },
  { id: "playlist", titulo: "Entre em uma playlist", selo: "Em playlist" },
];

export type DadosTrilha = {
  bio: string | null;
  foto: string | null;
  faixas: number;
  storiesComTrecho: number;
  emPlaylists: number;
  compartilhou: boolean;
};

/** A trilha só existe depois do primeiro envio publicado. */
export const mostraTrilha = (faixas: number) => faixas >= 1;

export function passosDaTrilha(d: DadosTrilha): Passo[] {
  const feito: Record<PassoId, boolean> = {
    perfil: !!d.bio?.trim() && !!d.foto,
    segunda: d.faixas >= 2,
    story: d.storiesComTrecho > 0,
    compartilhar: d.compartilhou,
    playlist: d.emPlaylists > 0,
  };
  return PASSOS.map((p) => ({ ...p, feito: feito[p.id] }));
}

export function progressoTrilha(passos: Passo[]): { feitos: number; total: number; completa: boolean } {
  const feitos = passos.filter((p) => p.feito).length;
  return { feitos, total: passos.length, completa: feitos === passos.length };
}
