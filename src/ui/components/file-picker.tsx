"use client";

import { useId, useState } from "react";

/**
 * A file input in the application's own words: the native control (and its
 * English "Choose File") is hidden; the person sees "Adicionar ficheiro" and
 * then the chosen file's name. The form and the upload rules are unchanged.
 */
export function FilePicker({
  name = "file",
  submitLabel = "Anexar ficheiro",
}: {
  readonly name?: string;
  readonly submitLabel?: string;
}) {
  const id = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        className="sr-only"
        id={id}
        name={name}
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        required
        type="file"
      />
      <label
        className="cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs hover:bg-neutral-50"
        htmlFor={id}
      >
        {fileName ? "Escolher outro ficheiro" : "Adicionar ficheiro"}
      </label>
      {fileName && (
        <span
          className="text-muted-foreground max-w-xs truncate text-xs"
          data-testid="file-name"
        >
          {fileName}
        </span>
      )}
      <button
        className="rounded-full border bg-white px-3 py-1.5 text-xs disabled:opacity-50"
        disabled={fileName === null}
      >
        {submitLabel}
      </button>
    </div>
  );
}
