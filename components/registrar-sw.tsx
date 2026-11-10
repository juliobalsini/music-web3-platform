"use client";

import { useEffect } from "react";

/** Registra o service worker (instalação do app e recebimento de áudio compartilhado). */
export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
