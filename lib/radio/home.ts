// Regras puras da Home "rádio viva": clima do horário, Seleção radioOn, artistas e perfil oficial.
import { CLIMAS, GENEROS, rotuloClima, rotuloGenero, type ClimaId } from "./generos.ts";
import { SEMANA } from "./rules.ts";

/** Perfil oficial da plataforma. É virtual (não há usuário no Auth): ids fixos, sem escrita no banco. */
export const PLATAFORMA_ID = "00000000-0000-4000-8000-0000000000a1";
export const PLATAFORMA_NOME = "radioOn";
export const STORY_BOAS_VINDAS_ID = "00000000-0000-4000-8000-0000000000a2";
export const TEXTO_BOAS_VINDAS = "Ouvir: é só dar play, sem cadastro.\nPontos: 30 s seguidos de escuta valem pontos.\nEnviar música: artistas publicam suas faixas.\nPlaylists: qualquer conta cria as suas.";

/** Dia da semana (0 = domingo) e hora em Brasília (UTC−3). */
export function relogioBrasilia(agora: number): { hora: number; dia: number } {
  const d = new Date(agora - 3 * 3600 * 1000);
  return { hora: d.getUTCHours(), dia: d.getUTCDay() };
}

/**
 * Clima do horário (Brasília): Madrugada 0–5h; Pista sex/sáb à noite (21h+); Domingo aos domingos;
 * Foco 6–11h; Estrada 17–20h; nos demais horários, Chuva.
 */
export function climaAgora(agora: number): ClimaId {
  const { hora, dia } = relogioBrasilia(agora);
  if (hora <= 5) return "madrugada";
  if ((dia === 5 || dia === 6) && hora >= 21) return "pista";
  if (dia === 0) return "domingo";
  if (hora <= 11) return "foco";
  if (hora >= 17 && hora <= 20) return "estrada";
  return "chuva";
}

type F = { id: string; mood: string | null; genre: string | null; createdAt: string };

/** Faixas do clima do horário; sem nenhuma, Chuva; sem nenhuma, as mais recentes (`recentes: true`). */
export function prateleiraClima<T extends F>(faixas: T[], agora: number, limite = 10): { clima: ClimaId; faixas: T[]; recentes: boolean } {
  const clima = climaAgora(agora);
  const por = (c: ClimaId) => faixas.filter((f) => f.mood === c).slice(0, limite);
  const doClima = por(clima);
  if (doClima.length > 0) return { clima, faixas: doClima, recentes: false };
  const chuva = por("chuva");
  if (chuva.length > 0) return { clima: "chuva", faixas: chuva, recentes: false };
  return { clima, faixas: [...faixas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limite), recentes: true };
}

export type Selecao = { id: string; title: string; tipo: "novidades" | "genero" | "clima"; faixas: string[] };

export const PREFIXO_SELECAO = "radioon-";
export const GENERO_MIN_FAIXAS = 3;

/**
 * Seleção radioOn: playlists automáticas, recalculadas a cada leitura. Novidades da semana (sem faixa
 * nova na semana, as 10 mais recentes), uma por gênero com ≥3 faixas e uma por clima com ≥1.
 */
export function selecaoRadioOn<T extends F>(faixas: T[], agora: number): Selecao[] {
  if (faixas.length === 0) return [];
  const recentes = [...faixas].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const semana = recentes.filter((f) => agora - Date.parse(f.createdAt) < SEMANA);
  const lista: Selecao[] = [{ id: `${PREFIXO_SELECAO}novidades`, title: "Novidades da semana", tipo: "novidades", faixas: (semana.length > 0 ? semana : recentes.slice(0, 10)).map((f) => f.id) }];
  for (const g of GENEROS) {
    const ids = recentes.filter((f) => f.genre === g.id).map((f) => f.id);
    if (ids.length >= GENERO_MIN_FAIXAS) lista.push({ id: `${PREFIXO_SELECAO}genero-${g.id}`, title: `${rotuloGenero(g.id)} na radioOn`, tipo: "genero", faixas: ids });
  }
  for (const c of CLIMAS) {
    const ids = recentes.filter((f) => f.mood === c.id).map((f) => f.id);
    if (ids.length > 0) lista.push({ id: `${PREFIXO_SELECAO}clima-${c.id}`, title: `${rotuloClima(c.id)} na radioOn`, tipo: "clima", faixas: ids });
  }
  return lista;
}

export const ehSelecao = (id: string) => id.startsWith(PREFIXO_SELECAO);

export type ArtistaResumo = { id: string; name: string; faixas: number };

/** Artistas com faixas publicadas: mais faixas primeiro, depois nome. */
export function artistasParaConhecer<T extends { artistId: string; artistName: string }>(faixas: T[], limite = 12): ArtistaResumo[] {
  const m = new Map<string, ArtistaResumo>();
  for (const f of faixas) {
    const a = m.get(f.artistId) ?? { id: f.artistId, name: f.artistName, faixas: 0 };
    a.faixas += 1;
    m.set(f.artistId, a);
  }
  return [...m.values()].sort((a, b) => b.faixas - a.faixas || a.name.localeCompare(b.name)).slice(0, limite);
}

/** "N ouvindo" inclui quem está olhando a rádio: nunca menos de 1. `outros` = ouvintes ativos sem contar você. */
export const totalOuvindo = (outros: number) => Math.max(0, outros) + 1;
