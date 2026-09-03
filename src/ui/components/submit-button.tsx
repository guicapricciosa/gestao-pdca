"use client";

import { useFormStatus } from "react-dom";

const variants = {
  primary: "bg-black text-white hover:bg-neutral-800 disabled:hover:bg-black",
  secondary: "border bg-white text-foreground hover:bg-neutral-50",
  danger: "border border-red-300 bg-white text-red-800 hover:bg-red-50",
} as const;

export function SubmitButton({
  children,
  pendingLabel = "A guardar…",
  variant = "primary",
  className = "",
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly pendingLabel?: string;
  readonly variant?: keyof typeof variants;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      aria-busy={pending}
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
