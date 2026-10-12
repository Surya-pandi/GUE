import Link from "next/link";
import { ArrowUpRight, MapPin, Building2, BadgeCheck } from "lucide-react";
import { Institution, mediaUrl } from "@/lib/data";
import { CompareButton } from "@/components/interactive";
export function CollegeCard({ college }: { college: Institution }) {
  const image = mediaUrl(college.cover_image_path);
  return (
    <article className="college-card">
      <Link href={`/colleges/${college.slug}`} className="college-cover">
        {image ? (
          <img src={image} alt={`${college.name} campus`} loading="lazy" />
        ) : (
          <div className="college-image-placeholder">
            <Building2 size={46} strokeWidth={1} />
            <span>Campus photograph not published</span>
          </div>
        )}
        <span className="photo-tag">{college.institution_type}</span>
      </Link>
      <div className="college-card-body">
        <p className="location">
          <MapPin size={14} />
          {college.city}, {college.state}
        </p>
        <h3>
          <Link href={`/colleges/${college.slug}`}>
            {college.name} <ArrowUpRight size={19} />
          </Link>
        </h3>
        <span className="verified">
          <BadgeCheck size={14} /> Institution verified
        </span>
        <p>
          {college.courses
            ?.slice(0, 3)
            .map((c) => c.name)
            .join(" · ") || "Course information coming soon"}
        </p>
        <div className="card-bottom">
          <Link className="text-link" href={`/colleges/${college.slug}`}>
            Explore college <ArrowUpRight size={15} />
          </Link>
          <CompareButton id={college.id} />
        </div>
      </div>
    </article>
  );
}
