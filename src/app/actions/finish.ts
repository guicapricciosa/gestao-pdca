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
): never {
  for (const route of [path, ...alsoRevalidate]) revalidatePath(route);
  if (error) {
    console.error("command failed", { path, message: error.message });
    redirect(
      `${path}?error=${encodeURIComponent(describeCommandError(error.message))}`,
    );
  }
  redirect(`${path}?saved=1`);
}

export function errorOf(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
