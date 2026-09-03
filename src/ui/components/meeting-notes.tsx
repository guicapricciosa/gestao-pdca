"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NoteView {
  readonly id: string;
  readonly content: string;
  readonly version: number;
  readonly created_at: string;
  readonly meeting_agenda_item_id: string | null;
  readonly author: { readonly display_name: string };
}

export type SaveNoteResult =
  | { readonly ok: true; readonly version: number }
  | {
      readonly ok: false;
      readonly reason: "conflict" | "error";
      readonly message: string;
    };

export type CreateNoteResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string };

interface MeetingNotesProps {
  readonly meetingId: string;
  readonly notes: readonly NoteView[];
  readonly agenda: readonly { readonly id: string; readonly title: string }[];
  readonly currentAgendaId: string | null;
  readonly editable: boolean;
  readonly saveNote: (input: {
    noteId: string;
    version: number;
    content: string;
  }) => Promise<SaveNoteResult>;
  readonly createNote: (input: {
    meetingId: string;
    content: string;
    agendaItemId: string | null;
  }) => Promise<CreateNoteResult>;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

const stateText: Record<SaveState, string> = {
  idle: "",
  dirty: "Por guardar",
  saving: "A guardar…",
  saved: "Guardado",
  conflict: "Conflito — rever",
  error: "Não guardado",
};

function NoteEditor({
  note,
  editable,
  saveNote,
  agendaTitle,
}: {
  readonly note: NoteView;
  readonly editable: boolean;
  readonly saveNote: MeetingNotesProps["saveNote"];
  readonly agendaTitle: string | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState(note.content);
  const [version, setVersion] = useState(note.version);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(content);
  useEffect(() => {
    latest.current = content;
  }, [content]);

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const text = latest.current;
    if (text.trim() === "" || text === note.content) return;
    setState("saving");
    const result = await saveNote({ noteId: note.id, version, content: text });
    if (result.ok) {
      setVersion(result.version);
      setState("saved");
      setMessage(null);
      return;
    }
    setState(result.reason === "conflict" ? "conflict" : "error");
    setMessage(result.message);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onChange = (value: string) => {
    setContent(value);
    if (state === "conflict") return;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1200);
  };

  const time = new Date(note.created_at).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!editable)
    return (
      <article className="border-b p-4 last:border-0">
        <p className="whitespace-pre-wrap">{note.content}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {note.author.display_name} · {time}
          {agendaTitle ? ` · ${agendaTitle}` : ""}
        </p>
      </article>
    );

  return (
    <article className="border-b p-4 last:border-0" data-testid="meeting-note">
      <textarea
        aria-label={`Nota de ${note.author.display_name}`}
        className="w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm"
        name="content"
        rows={Math.min(8, Math.max(2, content.split("\n").length))}
        value={content}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => void flush()}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {note.author.display_name} · {time}
          {agendaTitle ? ` · ${agendaTitle}` : ""}
        </span>
        <span
          className={
            state === "conflict" || state === "error"
              ? "font-medium text-red-700"
              : "text-muted-foreground"
          }
          data-testid="note-save-state"
          aria-live="polite"
        >
          {stateText[state]}
        </span>
      </div>
      {(state === "conflict" || state === "error") && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <p>
            {state === "conflict"
              ? "Alguém alterou esta nota entretanto. O teu texto está aqui em cima; copia-o se precisares e recarrega para ver a versão actual."
              : (message ?? "Não foi possível guardar.")}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-full border bg-white px-3 py-1"
              onClick={() => router.refresh()}
              type="button"
            >
              Recarregar
            </button>
            {state === "error" && (
              <button
                className="rounded-full border bg-white px-3 py-1"
                onClick={() => void flush()}
                type="button"
              >
                Tentar de novo
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function MeetingNotes({
  meetingId,
  notes,
  agenda,
  currentAgendaId,
  editable,
  saveNote,
  createNote,
}: MeetingNotesProps) {
  const router = useRouter();
  // The page re-renders after every meeting action; keep an unsent draft in
  // this browser tab so nothing typed is lost meanwhile.
  const draftKey =
    typeof window === "undefined"
      ? "meeting-note-draft"
      : `meeting-note-draft:${window.location.pathname}`;
  const [draft, setDraftState] = useState(() => {
    try {
      return window.sessionStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const setDraft = (value: string) => {
    setDraftState(value);
    try {
      if (value === "") window.sessionStorage.removeItem(draftKey);
      else window.sessionStorage.setItem(draftKey, value);
    } catch {
      /* storage unavailable: keep the in-memory draft only */
    }
  };
  const [agendaItemId, setAgendaItemId] = useState<string>(
    currentAgendaId ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const text = draft.trim();
    if (text === "" || busy) return;
    setBusy(true);
    setError(null);
    const result = await createNote({
      meetingId,
      content: text,
      agendaItemId: agendaItemId === "" ? null : agendaItemId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDraft("");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border bg-white">
      <h2 className="border-b p-5 text-lg font-semibold">Notas</h2>
      {notes.length === 0 && (
        <p className="text-muted-foreground p-5 text-sm">
          Ainda sem notas. Escreve o que for dito ou decidido; guarda sozinho.
        </p>
      )}
      {notes.map((note) => (
        <NoteEditor
          agendaTitle={
            agenda.find((item) => item.id === note.meeting_agenda_item_id)
              ?.title ?? null
          }
          editable={editable}
          key={note.id}
          note={note}
          saveNote={saveNote}
        />
      ))}
      {editable && (
        <div className="grid gap-2 border-t bg-neutral-50/60 p-5">
          <textarea
            aria-label="Nova nota"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            name="content"
            placeholder="Escreve o que foi dito ou decidido… (Ctrl+Enter para adicionar)"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                void submit();
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Tema da nota"
              className="rounded-lg border bg-white px-3 py-2 text-sm"
              value={agendaItemId}
              onChange={(event) => setAgendaItemId(event.target.value)}
            >
              <option value="">Nota geral</option>
              {agenda.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <button
              className="rounded-full border bg-white px-4 py-2 text-sm disabled:opacity-60"
              disabled={busy || draft.trim() === ""}
              onClick={() => void submit()}
              type="button"
            >
              {busy ? "A adicionar…" : "Adicionar nota"}
            </button>
            {error && <span className="text-xs text-red-700">{error}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
