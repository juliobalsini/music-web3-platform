// Curadores oficiais da radioOn (issue #122, fase 2, item 2; DECISIONS 111).
// Perfis virtuais criados pela conta oficial, como o próprio perfil radioOn: ids fixos, sem usuário no Auth e
// sem escrita no banco. Cada um assina as playlists da Seleção radioOn do seu gênero ("radioOn Jazz" → "Jazz na radioOn").
// Para criar outro curador oficial, basta acrescentar uma linha em CURADORES_OFICIAIS (PR revisado pelo gate).
import { GENEROS, type GeneroId } from "./generos.ts";
import { PLATAFORMA_ID, PLATAFORMA_NOME, PREFIXO_SELECAO, type Selecao } from "./home.ts";

export type CuradorOficial = { id: string; nome: string; genero: GeneroId; bio: string };

/** Id fixo e estável por posição: 00000000-0000-4000-8000-0000000001NN (NN em hexadecimal). */
const idCurador = (n: number) => `00000000-0000-4000-8000-0000000001${n.toString(16).padStart(2, "0")}`;

/** Um curador oficial por gênero, na ordem da lista de gêneros ("Outro" não vira curador). */
export const CURADORES_OFICIAIS: readonly CuradorOficial[] = GENEROS.filter((g) => g.id !== "outro").map((g, i) => ({
  id: idCurador(i + 1),
  nome: `${PLATAFORMA_NOME} ${g.label}`,
  genero: g.id,
  bio: `Curadoria oficial da ${PLATAFORMA_NOME}: ${g.label} independente, atualizada sozinha.`,
}));

const porId = new Map(CURADORES_OFICIAIS.map((c) => [c.id, c]));

export const curadorOficial = (id: string): CuradorOficial | null => porId.get(id) ?? null;

/** Perfil da plataforma (radioOn ou um curador oficial): ninguém segue, não há conta por trás. */
export const ehPerfilOficial = (id: string) => id === PLATAFORMA_ID || porId.has(id);

/** Ids de todos os perfis oficiais (para regras que recebem lista). */
export const IDS_OFICIAIS: readonly string[] = [PLATAFORMA_ID, ...CURADORES_OFICIAIS.map((c) => c.id)];

/** Quem assina uma playlist da Seleção: o curador do gênero; novidades e climas, o perfil radioOn. */
export function curadorDaSelecao(s: Pick<Selecao, "id" | "tipo">): { id: string; nome: string; oficial: "plataforma" | "curador" } {
  if (s.tipo === "genero") {
    const c = CURADORES_OFICIAIS.find((x) => s.id === `${PREFIXO_SELECAO}genero-${x.genero}`);
    if (c) return { id: c.id, nome: c.nome, oficial: "curador" };
  }
  return { id: PLATAFORMA_ID, nome: PLATAFORMA_NOME, oficial: "plataforma" };
}

/** Seleções assinadas por um curador oficial (vazio → o perfil não aparece; nada de perfil sem conteúdo). */
export const selecoesDoCurador = <T extends Pick<Selecao, "id" | "tipo">>(lista: T[], id: string): T[] =>
  lista.filter((s) => curadorDaSelecao(s).id === id);

/** Curadores oficiais com ao menos uma playlist na Seleção atual, na ordem da lista. */
export function curadoresAtivos(lista: Pick<Selecao, "id" | "tipo">[]): CuradorOficial[] {
  const ativos = new Set(lista.map((s) => curadorDaSelecao(s).id));
  return CURADORES_OFICIAIS.filter((c) => ativos.has(c.id));
}
