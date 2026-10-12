"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, X } from "lucide-react";
import { config } from "@/lib/config";
export function CompareButton({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      setSelected(
        JSON.parse(localStorage.getItem("compare") || "[]").includes(id),
      );
    } catch {}
  }, [id]);
  function toggle() {
    try {
      let ids: string[] = JSON.parse(localStorage.getItem("compare") || "[]");
      if (selected) ids = ids.filter((x) => x !== id);
      else if (ids.length < 4) ids.push(id);
      else {
        setMessage("Compare up to four colleges. Remove one first.");
        return;
      }
      localStorage.setItem("compare", JSON.stringify(ids));
      setSelected(!selected);
      setMessage("");
    } catch {
      setMessage("Your browser could not save this selection.");
    }
  }
  return (
    <div>
      <button
        type="button"
        className="button secondary small"
        onClick={toggle}
        aria-pressed={selected}
      >
        <GitCompareArrows size={16} />
        {selected ? "Remove comparison" : "Compare"}
      </button>
      {selected && (
        <Link className="text-link small" href="/compare">
          View comparison <ArrowRight size={14} />
        </Link>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function CompareLoader() {
  const [href, setHref] = useState("");
  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("compare") || "[]");
      if (ids.length) setHref("/compare?ids=" + ids.slice(0, 4).join(","));
    } catch {}
  }, []);
  return href ? (
    <Link className="button" href={href}>
      Show selected colleges <ArrowRight size={16} />
    </Link>
  ) : (
    <Link className="button" href="/colleges">
      Find colleges to compare <ArrowRight size={16} />
    </Link>
  );
}
export function LocalTime({ value }: { value: string }) {
  const [text, setText] = useState(
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value)) + " IST",
  );
  useEffect(
    () =>
      setText(
        new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value)) +
          " · " +
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    [value],
  );
  return <time dateTime={value}>{text}</time>;
}
export function HeroMedia() {
  const [source, setSource] = useState("");
  useEffect(() => {
    if (!config.heroVideo) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 640px)");
    const updateSource = () => {
      setSource(
        reducedMotion.matches
          ? ""
          : mobile.matches
            ? "/videos/mobile-intro.mp4"
            : "/videos/desktop-intro.mp4",
      );
    };
    updateSource();
    mobile.addEventListener("change", updateSource);
    reducedMotion.addEventListener("change", updateSource);
    return () => {
      mobile.removeEventListener("change", updateSource);
      reducedMotion.removeEventListener("change", updateSource);
    };
  }, []);
  return (
    <>
      {/* Licensed Unsplash photograph; illustrative campus image, not an institution listing. */}
      <picture>
        <source
          media="(max-width: 640px)"
          srcSet="/images/mobile-poster.webp"
        />
        <img
          className="hero-photo"
          src="/images/desktop-poster.webp"
          alt="Tree-lined university grounds with historic campus buildings"
          fetchPriority="high"
        />
      </picture>
      {source && (
        <video
          key={source}
          className="hero-photo"
          src={source}
          autoPlay
          muted
          playsInline
          loop
          aria-hidden="true"
          poster={
            source.includes("mobile")
              ? "/images/mobile-poster.webp"
              : "/images/desktop-poster.webp"
          }
          onError={() => setSource("")}
        />
      )}
    </>
  );
}
export function Gallery({
  images,
}: {
  images: { src: string; alt: string }[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  return (
    <>
      <div className="gallery">
        {images.map((im, index) => (
          <button
            key={im.src}
            aria-label={`Enlarge: ${im.alt}`}
            onClick={() => setSelected(index)}
          >
            <img src={im.src} alt={im.alt} loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        onClose={() => setSelected(null)}
      >
        <button
          autoFocus
          className="button secondary"
          onClick={() => setSelected(null)}
          aria-label="Close image"
        >
          <X />
        </button>
        {selected !== null && (
          <img src={images[selected].src} alt={images[selected].alt} />
        )}
      </dialog>
    </>
  );
}
