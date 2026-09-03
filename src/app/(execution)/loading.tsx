export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <div className="h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-4 h-10 w-72 rounded bg-neutral-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-white" />
        <div className="h-28 rounded-2xl bg-white" />
        <div className="h-28 rounded-2xl bg-white" />
      </div>
      <div className="mt-6 h-64 rounded-2xl bg-white" />
      <p className="sr-only">A carregar…</p>
    </div>
  );
}
