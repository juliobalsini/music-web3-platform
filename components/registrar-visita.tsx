"use client";

import { useEffect } from "react";

import { registrarLocal } from "@/lib/radio/continuar-local";
import type { TipoAtalho } from "@/lib/radio/continuar";

/** Não desenha nada: guarda a visita (playlist, álbum ou perfil) para o "Continue ouvindo". */
export function RegistrarVisita({ tipo, id, titulo, sub, capaId = null, temCapa = false }: { tipo: Exclude<TipoAtalho, "faixa">; id: string; titulo: string; sub: string; capaId?: string | null; temCapa?: boolean }) {
  useEffect(() => {
    registrarLocal({ tipo, id, titulo, sub, capaId, temCapa });
  }, [tipo, id, titulo, sub, capaId, temCapa]);
  return null;
}
