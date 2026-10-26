"use client";

export function ConfirmSubmit({ message, children }: { message: string; children: React.ReactNode }) {
  return <button type="submit" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
