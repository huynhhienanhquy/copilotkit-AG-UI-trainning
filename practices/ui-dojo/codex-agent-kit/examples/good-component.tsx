import { useId } from "react";

type ProfileFormProps = {
  initialName: string;
  isSaving: boolean;
  error?: string;
  onSave: (name: string) => Promise<void>;
};

export function ProfileForm({ initialName, isSaving, error, onSave }: ProfileFormProps) {
  const nameId = useId();
  const errorId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (name) await onSave(name);
  }

  return (
    <form onSubmit={handleSubmit} aria-describedby={error ? errorId : undefined}>
      <label htmlFor={nameId}>Display name</label>
      <input id={nameId} name="name" defaultValue={initialName} required maxLength={80} />
      {error && <p id={errorId} role="alert">{error}</p>}
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
