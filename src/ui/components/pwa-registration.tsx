"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker, offers app updates and keeps the install
 * prompt for the Definições page. Nothing here stores business data.
 */
export function PwaRegistration() {
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const frame = requestAnimationFrame(() => setOffline(!navigator.onLine));

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__installPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("installprompt-ready"));
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then((registration) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdateReady(worker);
          });
        };
        watch(registration.installing);
        registration.addEventListener("updatefound", () =>
          watch(registration.installing),
        );
        void registration.update();
      });
      // Reload only after the person accepted an update; the first
      // installation claiming the page must never interrupt what they do.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!window.__pwaUpdateAccepted) return;
        window.__pwaUpdateAccepted = false;
        window.location.reload();
      });
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, []);

  return (
    <>
      {offline && (
        <div
          className="fixed inset-x-0 top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900"
          data-testid="offline-banner"
          role="status"
        >
          Sem ligação à Internet. O que vês pode não estar actualizado.
        </div>
      )}
      {updateReady && (
        <div
          className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-lg"
          data-testid="update-ready"
          role="status"
        >
          <span>Nova versão disponível.</span>
          <button
            className="rounded-full bg-black px-3 py-1.5 text-white"
            onClick={() => {
              window.__pwaUpdateAccepted = true;
              updateReady.postMessage("SKIP_WAITING");
            }}
            type="button"
          >
            Actualizar
          </button>
        </div>
      )}
    </>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent;
    __pwaUpdateAccepted?: boolean;
  }
}
