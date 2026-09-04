import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { describeCommandError } from "@/shared/errors/describe";

/**
 * Ends a Server Action with visible feedback. The raw command message is
 * logged on the server; the person sees a translated, actionable notice on
 * the page they came from. Never call inside try/catch: redirect throws.
 */
export function finish(
  path: string,
  error: { readonly message: string } | Error | null | undefined,
  alsoRevalidate: readonly string[] = [],
  options: { readonly silent?: boolean } = {},
): never {
  // The return path may already carry a query string (a filtered list with
  // an open side panel); revalidate the route and append feedback safely.
  const route = path.split("?")[0] ?? path;
  const join = path.includes("?") ? "&" : "?";
  for (const target of [route, ...alsoRevalidate]) revalidatePath(target);
  if (error) {
    console.error("command failed", { path, message: error.message });
    redirect(
      `${path}${join}error=${encodeURIComponent(describeCommandError(error.message))}`,
    );
  }
  // Meeting Mode and other live screens show the new state itself; a
  // `?saved=1` there would also change the URL and remount the page segment
  // (closing open side sheets). Errors always surface.
  redirect(options.silent ? path : `${path}${join}saved=1`);
}

export function errorOf(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
