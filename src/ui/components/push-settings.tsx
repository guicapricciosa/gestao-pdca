"use client";

import { useEffect, useState } from "react";

type Permission = "unsupported" | "default" | "granted" | "denied";

interface Device {
  readonly id: string;
  readonly userAgent: string | null;
  readonly createdAt: string;
  readonly endpointHash: string;
}

function describe(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone/iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "Dispositivo";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "browser";
  return `${os} · ${browser}`;
}

function toBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Enables or disables push on this device and lists the others. */
export function PushSettings({ publicKey }: { readonly publicKey: string }) {
  const [permission, setPermission] = useState<Permission>("default");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<readonly Device[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadDevices = async () => {
    const response = await fetch("/api/push/subscriptions");
    if (response.ok)
      setDevices(((await response.json()) as { devices: Device[] }).devices);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (
        !("Notification" in window) ||
        !("PushManager" in window) ||
        !("serviceWorker" in navigator)
      ) {
        setPermission("unsupported");
        setSubscribed(false);
        return;
      }
      setPermission(Notification.permission as Permission);
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((existing) => setSubscribed(existing !== null));
      void loadDevices();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const enable = async () => {
    setMessage(null);
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
    if (result !== "granted") {
      setMessage(
        "Sem permissão do browser, não é possível receber notificações neste dispositivo.",
      );
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBytes(publicKey),
        }));
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("not registered");
      setSubscribed(true);
      setMessage("Este dispositivo passa a receber notificações.");
      await loadDevices();
    } catch {
      setMessage("Não foi possível activar as notificações neste dispositivo.");
    }
  };

  const disable = async () => {
    setMessage(null);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/subscriptions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    setSubscribed(false);
    setMessage("Este dispositivo deixa de receber notificações.");
    await loadDevices();
  };

  const remove = async (id: string) => {
    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadDevices();
  };

  return (
    <div
      className="space-y-3 text-sm"
      data-testid="push-settings"
      data-permission={permission}
    >
      {permission === "unsupported" && (
        <p className="text-muted-foreground">
          Este browser não suporta notificações push. No iPhone/iPad, instala a
          aplicação primeiro (Partilhar → Adicionar ao ecrã principal).
        </p>
      )}
      {permission === "denied" && (
        <p className="text-muted-foreground">
          O browser bloqueou as notificações para esta aplicação. Podes voltar a
          permitir nas definições do site.
        </p>
      )}
      {permission !== "unsupported" &&
        permission !== "denied" &&
        !publicKey && (
          <p className="text-muted-foreground">
            As notificações push não estão configuradas neste ambiente.
          </p>
        )}
      {permission !== "unsupported" &&
        permission !== "denied" &&
        publicKey &&
        subscribed !== null && (
          <button
            className="rounded-full border bg-white px-4 py-2 hover:bg-neutral-50"
            data-testid="push-toggle"
            onClick={() => void (subscribed ? disable() : enable())}
            type="button"
          >
            {subscribed
              ? "Desactivar neste dispositivo"
              : "Receber neste dispositivo"}
          </button>
        )}
      {message && (
        <p className="text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {devices.length > 0 && (
        <ul className="divide-y rounded-lg border" data-testid="push-devices">
          {devices.map((device) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2"
              key={device.id}
            >
              <span>
                {describe(device.userAgent)}
                <span className="text-muted-foreground">
                  {" "}
                  · desde{" "}
                  {new Date(device.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </span>
              <button
                className="text-muted-foreground text-xs underline underline-offset-4"
                onClick={() => void remove(device.id)}
                type="button"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
