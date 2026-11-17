"use client";

import { useEffect } from "react";

import { usePreferencias } from "@/lib/preferencias/cliente";
import { atributosAparencia, DESTAQUES } from "@/lib/preferencias/rules";

/**
 * Aplica a aparência antes da 1ª pintura (sem piscar o âmbar): lê o aparelho e marca <html>.
 * Mesma lógica de `atributosAparencia`; texto fixo, sem dados de fora.
 */
export const SCRIPT_APARENCIA = `(function(){try{var p=JSON.parse(localStorage.getItem("radioon:prefs")||"{}"),d=document.documentElement,c=${JSON.stringify(
  DESTAQUES.filter((x) => x !== "ambar"),
)};if(c.indexOf(p.destaque)>=0)d.setAttribute("data-destaque",p.destaque);if(p.textoMaior===true)d.setAttribute("data-texto","maior");if(p.reduzirAnimacoes===true)d.setAttribute("data-movimento","reduzido")}catch(e){}})()`;

/** Mantém <html> em dia quando a pessoa muda a aparência (nesta aba, em outra ou ao entrar na conta). */
export function Aparencia() {
  const { destaque, textoMaior, reduzirAnimacoes } = usePreferencias();
  useEffect(() => {
    const raiz = document.documentElement;
    for (const [nome, valor] of Object.entries(atributosAparencia({ destaque, textoMaior, reduzirAnimacoes }))) {
      if (valor === null) raiz.removeAttribute(nome);
      else raiz.setAttribute(nome, valor);
    }
  }, [destaque, textoMaior, reduzirAnimacoes]);
  return null;
}
