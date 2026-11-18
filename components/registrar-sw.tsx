"use client";

import { useEffect } from "react";

import { iniciarInstalar } from "@/lib/instalar-cliente";

/** Registra o service worker (instalação do app e recebimento de áudio compartilhado) e liga a captura do botão "Instalar a radioOn". */
export function RegistrarSW() {
  useEffect(() => {
    iniciarInstalar();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
