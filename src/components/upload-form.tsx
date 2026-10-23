"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadBatch, type UploadResult } from "@/lib/upload-batch";

type QueuedFile = { file: File; label: string; result?: UploadResult };
export function UploadForm({
  institutionId,
  kind,
  category = "campus",
  categoryLabel = "Campus",
  continueSetup = false,
  uploadedCount = 0,
}: {
  institutionId: string;
  kind: "document" | "media";
  category?: string;
  categoryLabel?: string;
  continueSetup?: boolean;
  uploadedCount?: number;
}) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchSize, setBatchSize] = useState(0);
  const busy = useRef(false);
  const router = useRouter();
  const retry = files.some((item) => item.result);
  const candidates = files
    .map((item, index) => ({ ...item, index }))
    .filter(
      (item) =>
        !item.result || (!item.result.ok && item.result.retryable !== false),
    );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !candidates.length) return;
    if (files.length > 20) {
      setMessage("Select up to 20 images per batch.");
      return;
    }
    if (
      candidates.some(
        (item) => item.label.trim().length < 3 || item.label.length > 500,
      )
    ) {
      setMessage("Add a description of 3 to 500 characters for each file.");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    setProgress(0);
    setBatchSize(candidates.length);
    const uncertain = files.some(
      (item) =>
        item.result && !item.result.ok && item.result.retryable === false,
    );
    try {
      const results = await uploadBatch(
        candidates,
        async (item, finish) => {
          if (
            item.file.size > (kind === "media" ? 5 : 10) * 1024 * 1024 ||
            item.file.size < 12
          )
            return {
              ok: false,
              retryable: false,
              message: `File must be between 12 bytes and ${kind === "media" ? 5 : 10} MB. Choose a smaller file.`,
            };
          const data = new FormData();
          data.set("institution_id", institutionId);
          data.set("kind", kind);
          data.set("category", category);
          data.set("label", item.label.trim());
          data.set("file", item.file);
          if (continueSetup && finish && !uncertain)
            data.set("continue_setup", "true");
          const response = await fetch("/api/uploads", {
            method: "POST",
            body: data,
          });
          const result = await response.json();
          return {
            ok: response.ok,
            message: result.message || result.error || "Upload failed.",
            retryable: response.ok ? false : result.retryable !== false,
            nextPath: result.nextPath,
          };
        },
        (index, result) => {
          const originalIndex = candidates[index].index;
          setFiles((previous) =>
            previous.map((item, position) =>
              position === originalIndex ? { ...item, result } : item,
            ),
          );
          setProgress(index + 1);
        },
      );
      const succeeded = results.filter((result) => result.ok).length;
      setMessage(
        `${succeeded} of ${results.length} files uploaded in this attempt. Successful files will not be uploaded again. Review the results below.`,
      );
      router.refresh();
      if (!uncertain && results.every((result) => result.ok)) {
        const nextPath = results.at(-1)?.nextPath;
        if (nextPath) router.push(nextPath);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-card wide">
      <h3>
        {kind === "media" ? `${categoryLabel} photos` : "Upload a document"}
      </h3>
      <p>
        {kind === "media"
          ? "Select up to 20 photos at once. JPEG, PNG, or WebP, up to 5 MB each."
          : "PDF, JPEG, PNG, or WebP, up to 10 MB."}{" "}
        Photos appear automatically when your university is published. Existing
        gallery storage and upload limits still apply.
      </p>
      {kind === "media" && (
        <p>
          <strong>Minimum 3 photos in this section.</strong> {uploadedCount}{" "}
          already uploaded. You can add photos in separate batches; only
          successful uploads count.
        </p>
      )}
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        <label className="field">
          <span>{kind === "media" ? "Choose photos" : "Choose a file"}</span>
          <input
            type="file"
            multiple={kind === "media"}
            accept={
              kind === "media"
                ? ".jpg,.jpeg,.png,.webp"
                : ".pdf,.jpg,.jpeg,.png,.webp"
            }
            onChange={(event) => {
              const chosen = Array.from(event.target.files || []);
              if (chosen.length > 20) {
                event.target.value = "";
                setMessage(
                  "Select up to 20 images at a time. Your previous selection has been kept.",
                );
                return;
              }
              setFiles(
                chosen.map((file) => ({
                  file,
                  label:
                    `${categoryLabel}: ${file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")}`.slice(
                      0,
                      500,
                    ),
                })),
              );
              setMessage("");
            }}
          />
        </label>
        {files.length > 0 && (
          <p>
            {files.length} file(s) selected. Review each photo description
            before uploading.
          </p>
        )}
        {files.map((item, index) => (
          <div
            className="upload-file-result"
            key={`${index}-${item.file.name}`}
          >
            <strong style={{ overflowWrap: "anywhere" }}>
              {item.file.name}
            </strong>
            <label className="field">
              <span>
                {kind === "media"
                  ? "Photo description"
                  : "Document description"}
              </span>
              <input
                value={item.label}
                disabled={Boolean(item.result?.ok)}
                minLength={3}
                maxLength={500}
                required
                onChange={(event) => {
                  const label = event.target.value;
                  setFiles((previous) =>
                    previous.map((entry, position) =>
                      position === index ? { ...entry, label } : entry,
                    ),
                  );
                }}
              />
            </label>
            {item.result && (
              <p className={item.result.ok ? "alert success" : "alert error"}>
                {item.result.ok ? "Uploaded. " : "Not confirmed. "}
                {item.result.message}
              </p>
            )}
          </div>
        ))}
        <button className="button" disabled={pending || !candidates.length}>
          {pending
            ? "Uploading..."
            : retry
              ? "Retry failed files"
              : `Upload ${files.length || "selected"} ${kind === "media" ? "photos" : "file"}`}
        </button>
      </fieldset>
      {pending && (
        <div role="status">
          <progress value={progress} max={batchSize || 1} /> Uploading batch...
        </div>
      )}
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
