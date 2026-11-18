"use client";

import { useSyncExternalStore } from "react";

import { CHAVE_FECHADO, CHAVE_VISITAS, lerNumero, mostrarAviso, plataformaDe, type Plataforma } from "@/lib/instalar";

/** Evento do Chrome/Edge que permite abrir a instalação nativa num toque (não está no lib.dom). */
type EventoInstalar = Event & { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** `nativo`: um toque abre a instalação do navegador; os demais abrem o painel com passos. null: não mostrar nada. */
export type ModoInstalar = Exclude<Plataforma, "outro"> | "nativo";
export type EstadoInstalar = { modo: ModoInstalar | null; aviso: boolean };

const VISITA_DA_SESSAO = "radioon_visita_contada";
let evento: EventoInstalar | null = null;
let instalado = false;
let iniciado = false;
let estado: EstadoInstalar = { modo: null, aviso: false };
const ouvintes = new Set<() => void>();

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* modo privado: segue sem guardar */
  }
}

function standalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function recalcular() {
  let modo: ModoInstalar | null = null;
  if (!instalado && !standalone()) {
    const p = plataformaDe(navigator.userAgent, navigator.maxTouchPoints ?? 0);
    modo = p === "interno" ? "interno" : evento ? "nativo" : p === "outro" ? null : p;
  }
  const aviso = modo !== null && mostrarAviso({ visitas: lerNumero(ler(CHAVE_VISITAS)) ?? 0, fechadoEm: lerNumero(ler(CHAVE_FECHADO)), agora: Date.now() });
  if (modo !== estado.modo || aviso !== estado.aviso) {
    estado = { modo, aviso };
    ouvintes.forEach((o) => o());
  }
}

/** Liga a captura uma vez (chamado no carregamento do app): o evento pode chegar antes de qualquer tela pedir. */
export function iniciarInstalar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  try {
    if (!sessionStorage.getItem(VISITA_DA_SESSAO)) {
      sessionStorage.setItem(VISITA_DA_SESSAO, "1");
      gravar(CHAVE_VISITAS, String((lerNumero(ler(CHAVE_VISITAS)) ?? 0) + 1));
    }
  } catch {
    /* sem armazenamento: o aviso da Home não aparece */
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // o navegador não mostra a própria faixa; a radioOn oferece o botão
    evento = e as EventoInstalar;
    recalcular();
  });
  window.addEventListener("appinstalled", () => {
    instalado = true;
    evento = null;
    recalcular();
  });
  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", recalcular);
  recalcular();
}

// Captura o mais cedo possível: o módulo carrega com o layout, antes da hidratação das telas.
iniciarInstalar();

function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

const NADA: EstadoInstalar = { modo: null, aviso: false };

/** Estado da instalação neste aparelho (no servidor: nada). */
export function useInstalar(): EstadoInstalar {
  return useSyncExternalStore(assinar, () => estado, () => NADA);
}

/** Abre a instalação nativa. Retorna false se o navegador não oferece (aí vale o painel com passos). */
export async function instalarNativo(): Promise<boolean> {
  const e = evento;
  if (!e) return false;
  evento = null; // o evento só pode ser usado uma vez
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") instalado = true;
  } catch {
    /* o navegador recusou abrir: some o botão até o próximo evento */
  }
  recalcular();
  return true;
}

/** Fecha o aviso da Home por 14 dias. */
export function fecharAviso() {
  gravar(CHAVE_FECHADO, String(Date.now()));
  recalcular();
}
