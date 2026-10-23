"use client";

import { useState } from "react";
import { Gallery } from "@/components/interactive";
import { mediaCategories } from "@/lib/university-setup";

type Photo = { src: string; alt: string; category: string | null };

export function CategorizedGallery({ images }: { images: Photo[] }) {
  const [selected, setSelected] = useState("all");
  const groups = mediaCategories
    .map((category) => ({
      ...category,
      images: images.filter((image) => {
        const known = mediaCategories.some(
          (item) => item.value === image.category,
        );
        return (known ? image.category : "other") === category.value;
      }),
    }))
    .filter((group) => group.images.length > 0);

  return (
    <section
      className="categorized-gallery"
      aria-label="University photos by category"
    >
      <h2>Explore the university in photos</h2>
      <p>
        Browse campus spaces, accommodation, labs, and more. Select a photo to
        enlarge it.
      </p>
      <div
        className="photo-category-filters"
        role="group"
        aria-label="Filter photo categories"
      >
        <button
          type="button"
          className="tag"
          aria-pressed={selected === "all"}
          onClick={() => setSelected("all")}
        >
          All photos ({images.length})
        </button>
        {groups.map((group) => (
          <button
            type="button"
            className="tag"
            key={group.value}
            aria-pressed={selected === group.value}
            onClick={() => setSelected(group.value)}
          >
            {group.label} ({group.images.length})
          </button>
        ))}
      </div>
      {groups
        .filter((group) => selected === "all" || selected === group.value)
        .map((group) => (
          <section
            className="photo-category-section"
            key={group.value}
            aria-label={`${group.label} photos`}
          >
            <h3>
              {group.label}{" "}
              <span className="photo-category-count">
                {group.images.length} photos
              </span>
            </h3>
            <Gallery images={group.images} />
          </section>
        ))}
    </section>
  );
}
