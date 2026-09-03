/**
 * Deep links (shared meeting links, notifications) come back to the login page
 * as `?next=`. Only same-origin relative paths are ever followed.
 */
export function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/my-work";
  if (value.startsWith("/login")) return "/my-work";
  return value;
}
