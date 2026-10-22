"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
export function SearchInput({ suggestions = true }: { suggestions?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    { name: string; slug: string; city: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!suggestions || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setResults([]);
    setLoading(false);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults(await response.json());
        else setResults([]);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, suggestions]);
  return (
    <div
      className="suggestion-input"
      ref={ref}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="University, course, or keyword"
        aria-label="University, course, or keyword"
        autoComplete="off"
        aria-controls={
          open && results.length ? "university-suggestions" : undefined
        }
      />
      {open && q.length >= 2 && (loading || results.length > 0) && (
        <div
          id="university-suggestions"
          className="suggestion-results"
          aria-label="University suggestions"
        >
          {loading ? (
            <span role="status">Searching universities…</span>
          ) : (
            results.map((r) => (
              <Link key={r.slug} href={`/universities/${r.slug}`}>
                {r.name}
                <small>{r.city}</small>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
