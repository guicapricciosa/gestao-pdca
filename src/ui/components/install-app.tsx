"use client";

import { useEffect, useState } from "react";

type Mode = "installed" | "prompt" | "ios" | "manual";

function detect(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (window.__installPrompt) return "prompt";
  const ua = navigator.userAgent;
  const apple =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  if (apple) return "ios";
  return "manual";
}

/** Quiet install guidance; never a pop-up. */
export function InstallApp({ appName }: { readonly appName: string }) {
  const [mode, setMode] = useState<Mode>("manual");
  useEffect(() => {
    // Detected after hydration so server and client render the same first.
    const frame = requestAnimationFrame(() => setMode(detect()));
    const onReady = () => setMode(detect());
    window.addEventListener("installprompt-ready", onReady);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("installprompt-ready", onReady);
    };
  }, []);

  return (
    <section
      className="rounded-2xl border bg-white p-5"
      data-testid="install-app"
      data-mode={mode}
    >
      <h2 className="font-semibold">Instalar aplicação</h2>
      {mode === "installed" && (
        <p className="text-muted-foreground mt-2 text-sm">
          {appName} já está instalada neste dispositivo.
        </p>
      )}
      {mode === "prompt" && (
        <>
          <p className="text-muted-foreground mt-2 text-sm">
            Fica com ícone próprio, abre em janela própria e recebe
            notificações.
          </p>
          <button
            className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white"
            onClick={async () => {
              const prompt = window.__installPrompt;
              if (!prompt) return;
              await prompt.prompt();
              const { outcome } = await prompt.userChoice;
              if (outcome === "accepted") setMode("installed");
            }}
            type="button"
          >
            Instalar aplicação
          </button>
        </>
      )}
      {mode === "ios" && (
        <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Abre esta página no Safari.</li>
          <li>
            Toca em <strong>Partilhar</strong> (o quadrado com a seta).
          </li>
          <li>
            Escolhe <strong>Adicionar ao ecrã principal</strong>.
          </li>
        </ol>
      )}
      {mode === "manual" && (
        <p className="text-muted-foreground mt-2 text-sm">
          No Chrome ou Edge, usa o ícone de instalação na barra de endereço (ou
          o menu ⋮ → «Instalar {appName}»). No Android, o menu do browser tem
          «Adicionar ao ecrã principal».
        </p>
      )}
    </section>
  );
}
