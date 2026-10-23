import Link from "next/link";
import { ArrowUpRight, MapPin, Building2, BadgeCheck } from "lucide-react";
import { Institution, mediaUrl } from "@/lib/data";
import { CompareButton } from "@/components/interactive";
export function UniversityCard({ university }: { university: Institution }) {
  const image = mediaUrl(university.cover_image_path);
  return (
    <article className="university-card">
      <Link
        href={`/universities/${university.slug}`}
        className="university-cover"
      >
        {image ? (
          <img src={image} alt={`${university.name} campus`} loading="lazy" />
        ) : (
          <div className="university-image-placeholder">
            <Building2 size={46} strokeWidth={1} />
            <span>Campus photograph not published</span>
          </div>
        )}
        <span className="photo-tag">{university.institution_type}</span>
      </Link>
      <div className="university-card-body">
        <p className="location">
          <MapPin size={14} />
          {university.city}, {university.state}
        </p>
        <h3>
          <Link href={`/universities/${university.slug}`}>
            {university.name} <ArrowUpRight size={19} />
          </Link>
        </h3>
        <span className="verified">
          <BadgeCheck size={14} /> University profile
        </span>
        <p>
          {university.courses
            ?.slice(0, 3)
            .map((c) => c.name)
            .join(" · ") || "Course information coming soon"}
        </p>
        <div className="card-bottom">
          <Link className="text-link" href={`/universities/${university.slug}`}>
            Explore university <ArrowUpRight size={15} />
          </Link>
          <CompareButton id={university.id} />
        </div>
      </div>
    </article>
  );
}
