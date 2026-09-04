"use client";

import { useEffect, useRef, useState } from "react";

import { safeNextPath } from "@/app/login/next-path";
import { createSupabaseBrowserClient } from "@/platform/supabase/browser";

/**
 * Where invite and recovery e-mails land. Supabase can send either a PKCE
 * `?code=` link or an implicit `#access_token=` link; the browser client
 * understands both, turns them into the session cookie and we continue to
 * `next` with a full navigation so the server sees the new session.
 */
export default function AuthCallbackPage() {
  const [failed, setFailed] = useState(false);
  // A one-time code can only be exchanged once: never run this twice, even
  // when React re-runs effects in development.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const client = createSupabaseBrowserClient();
    const params = new URLSearchParams(window.location.search);
    const next = safeNextPath(params.get("next"));
    const code = params.get("code");
    const hasHash = window.location.hash.includes("access_token=");
    const finish = (ok: boolean) => {
      if (ok) window.location.replace(next);
      else setFailed(true);
    };
    (async () => {
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error)
          console.error("auth callback: exchange failed", error.message);
        finish(error === null);
        return;
      }
      if (hasHash) {
        // Implicit link (invites, recovery sent with the server key): the
        // tokens are in the fragment; store them as the session cookie.
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get("access_token") ?? "";
        const refreshToken = hash.get("refresh_token") ?? "";
        const { error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error)
          console.error("auth callback: session failed", error.message);
        finish(error === null);
        return;
      }
      const { data } = await client.auth.getSession();
      finish(data.session !== null);
    })().catch(() => setFailed(true));
  }, []);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
        {failed ? (
          <>
            <h1 className="text-2xl font-semibold">
              Esse link já não é válido
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Pede um novo em «Esqueci-me da palavra-passe» ou a quem gere a
              plataforma.
            </p>
            <a
              className="mt-6 inline-flex rounded-full border px-4 py-2 text-sm"
              href="/recuperar-palavra-passe"
            >
              Pedir novo link
            </a>
          </>
        ) : (
          <p
            className="text-muted-foreground text-sm"
            data-testid="auth-callback"
          >
            A entrar…
          </p>
        )}
      </section>
    </main>
  );
}
