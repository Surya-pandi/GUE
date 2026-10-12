"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function UploadForm({
  institutionId,
  kind,
}: {
  institutionId: string;
  kind: "document" | "media";
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json();
      setMessage(result.message || result.error);
      if (response.ok) {
        form.reset();
        router.refresh();
      }
    } catch {
      setMessage("The upload failed. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-card wide">
      <h3>
        {kind === "document"
          ? "Upload a verification document"
          : "Submit a campus photograph"}
      </h3>
      <p>
        Files stay private until reviewed.{" "}
        {kind === "document"
          ? "PDF, JPEG, PNG, or WebP · up to 10 MB."
          : "JPEG, PNG, or WebP · up to 5 MB."}{" "}
        Upload only files you are authorized to share.
      </p>
      <input type="hidden" name="institution_id" value={institutionId} />
      <input type="hidden" name="kind" value={kind} />
      <label className="field">
        <span>
          {kind === "document"
            ? "Document type / description"
            : "Descriptive alternative text"}
        </span>
        <input name="label" required minLength={3} maxLength={500} />
      </label>
      <label className="field">
        <span>File</span>
        <input
          name="file"
          type="file"
          accept={
            kind === "document"
              ? ".pdf,.jpg,.jpeg,.png,.webp"
              : ".jpg,.jpeg,.png,.webp"
          }
          required
        />
      </label>
      <button disabled={pending} className="button">
        {pending ? "Uploading…" : "Upload for review"}
      </button>
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
