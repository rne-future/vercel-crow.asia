"use client";
import { startTransition, useActionState } from "react";

export type MutationState = { error?: string; success?: string };

export function AdminMutationForm({ action, submitLabel, children, className }: {
  action: (previous: MutationState, form: FormData) => Promise<MutationState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className={className} aria-busy={pending} onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Retain the submitted fields when validation fails instead of resetting the form.
    startTransition(() => formAction(data));
  }}>
    <fieldset disabled={pending} className="grid min-w-0 gap-3">
      {children}
      <button type="submit" className="w-fit min-h-11 rounded border border-stone-500 px-4 py-2 font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        {pending ? "Menyimpan…" : submitLabel}
      </button>
    </fieldset>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-800">{state.error}</p>}
    {state.success && <p role="status" className="mt-2 text-sm text-green-800">{state.success}</p>}
  </form>;
}
