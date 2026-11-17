"use client";

import { useEffect, useState } from "react";

import { usePreferencias } from "@/lib/preferencias/cliente";
import { atributosAparencia, COR_BARRA, DESTAQUES } from "@/lib/preferencias/rules";

const CONSULTA_CLARO = "(prefers-color-scheme: light)";

/**
 * Aplica a aparência antes da 1ª pintura (sem piscar o âmbar): lê o aparelho e marca <html>.
 * Mesma lógica de `atributosAparencia`; texto fixo, sem dados de fora.
 */
export const SCRIPT_APARENCIA = `(function(){try{var p=JSON.parse(localStorage.getItem("radioon:prefs")||"{}"),d=document.documentElement,c=${JSON.stringify(
  DESTAQUES.filter((x) => x !== "ambar"),
)};if(p.tema==="claro"||(p.tema==="auto"&&matchMedia(${JSON.stringify(CONSULTA_CLARO)}).matches)){d.setAttribute("data-tema","claro");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(COR_BARRA.claro)})}if(c.indexOf(p.destaque)>=0)d.setAttribute("data-destaque",p.destaque);if(p.textoMaior===true)d.setAttribute("data-texto","maior");if(p.reduzirAnimacoes===true)d.setAttribute("data-movimento","reduzido")}catch(e){}})()`;

/** Mantém <html> em dia quando a pessoa muda a aparência (nesta aba, em outra ou ao entrar na conta). */
export function Aparencia() {
  const { tema, destaque, textoMaior, reduzirAnimacoes } = usePreferencias();
  const sistemaClaro = useSistemaClaro(tema === "auto");
  useEffect(() => {
    const raiz = document.documentElement;
    const attrs = atributosAparencia({ tema, destaque, textoMaior, reduzirAnimacoes }, sistemaClaro);
    for (const [nome, valor] of Object.entries(attrs)) {
      if (valor === null) raiz.removeAttribute(nome);
      else raiz.setAttribute(nome, valor);
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", attrs["data-tema"] ? COR_BARRA.claro : COR_BARRA.escuro);
  }, [tema, destaque, textoMaior, reduzirAnimacoes, sistemaClaro]);
  return null;
}

/** Tema do sistema, ouvido só no modo automático (troca ao vivo quando o aparelho muda). */
function useSistemaClaro(ouvir: boolean): boolean {
  const [claro, setClaro] = useState(false);
  useEffect(() => {
    if (!ouvir) return;
    const mq = window.matchMedia(CONSULTA_CLARO);
    const atualizar = () => setClaro(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, [ouvir]);
  return claro;
}
