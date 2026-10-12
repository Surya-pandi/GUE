import Link from "next/link";
import { Empty } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="container section">
      <Empty title="This path doesn’t lead to a page." icon="compass">
        The page may have moved, or the institution may not be published.
      </Empty>
      <Link className="button" href="/colleges">
        Explore colleges
      </Link>
    </div>
  );
}
