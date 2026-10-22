import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Cog,
  Palette,
  HeartPulse,
  ChartNoAxesCombined,
  Sprout,
  Scale,
  Compass,
  Video,
  Building2,
  Check,
  MoveUpRight,
} from "lucide-react";
import { HeroMedia } from "@/components/interactive";
import { UniversityCard } from "@/components/university-card";
import { institutions } from "@/lib/data";
import { streams } from "@/lib/config";
import { session } from "@/lib/auth";
export const dynamic = "force-dynamic";
const icons = [Cog, Palette, HeartPulse, ChartNoAxesCombined, Sprout, Scale];
const descriptions = [
  "Build what comes next",
  "Think beyond boundaries",
  "Make a difference in care",
  "Lead ideas into action",
  "Grow a sustainable future",
  "Stand for what matters",
];
export default async function Home() {
  const s = await session();
  const universities = s ? await institutions({}, 3) : { rows: [] };
  return (
    <>
      <section className="campus-hero" aria-labelledby="hero-title">
        <div className="campus-hero-copy">
          <p className="campus-hero-eyebrow">
            <span /> YOUR NEXT CHAPTER
          </p>
          <h1 id="hero-title">
            Big dreams.
            <br />
            <em>Your move.</em>
          </h1>
          <p className="campus-hero-description">
            Find your people. Discover your campus. Make room for who you could
            become.
          </p>
          <Link className="campus-hero-link" href="/universities">
            Find your university <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="campus-hero-film">
          <HeroMedia />
        </div>
      </section>
      <section
        className="container future-section"
        aria-labelledby="future-title"
      >
        <div className="future-panel">
          <div className="future-edition">
            <span>GLOBAL UNIVERSITY EXPO</span>
            <span>THE NEXT CHAPTER / YOURS</span>
          </div>
          <div className="future-intro">
            <span className="future-kicker">
              <span /> A WORLD OF WHAT?S NEXT
            </span>
            <h2 id="future-title">
              Small step.
              <br />
              <em>Limitless future.</em>
            </h2>
            <p>
              A campus that inspires you. A course that moves you. Start with
              what matters to you.
            </p>
            <Link
              className="future-cta"
              href={s ? "/universities" : "/register"}
            >
              {s ? "Explore your possibilities" : "Start your journey"}{" "}
              <ArrowUpRight size={20} />
            </Link>
            <span className="future-note">
              {s
                ? "Make your next move with confidence."
                : "Find the right direction for your next chapter."}
            </span>
          </div>
          <div className="future-orbit" aria-hidden="true">
            <div className="orbit-ring orbit-ring-one" />
            <div className="orbit-ring orbit-ring-two" />
            <div className="orbit-ring orbit-ring-three" />
            <span className="orbit-star">?</span>
            <span className="orbit-core">
              <ArrowUpRight strokeWidth={1} />
            </span>
            <span className="orbit-label orbit-label-top">CURIOSITY</span>
            <span className="orbit-label orbit-label-bottom">POSSIBILITY</span>
            <span className="orbit-dot" />
          </div>
          <div className="future-paths">
            {[
              {
                number: "01",
                icon: Building2,
                title: "A place to belong",
                description: "Discover a university that feels like you.",
                href: "/universities",
                label: "EXPLORE UNIVERSITIES",
              },
              {
                number: "02",
                icon: Compass,
                title: "A passion to pursue",
                description: "Turn what you love into what comes next.",
                href: "/courses",
                label: "DISCOVER COURSES",
              },
              {
                number: "03",
                icon: Video,
                title: "A conversation away",
                description: "Bring your questions to an admissions team.",
                href: "/counselling",
                label: "MEET ADMISSIONS",
              },
            ].map(({ number, icon: Icon, title, description, href, label }) => (
              <Link className="future-path" href={href} key={number}>
                <span className="future-path-icon">
                  <Icon size={23} strokeWidth={1.5} />
                </span>
                <span className="future-path-copy">
                  <span className="future-path-label">{label}</span>
                  <h3>{title}</h3>
                  <span className="future-path-description">{description}</span>
                </span>
                <span className="future-path-end">
                  <span>{number}</span>
                  <ArrowUpRight size={21} />
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="future-caption">
          <span>BIG DREAMS. REAL POSSIBILITIES.</span>
          <span>
            One decision can open a whole new world. <ArrowRight size={14} />
          </span>
        </div>
      </section>
      <section className="container section streams-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOLLOW YOUR CURIOSITY</p>
            <h2>What will you make your own?</h2>
          </div>
          <Link className="text-link" href="/courses">
            Explore all courses <ArrowRight size={17} />
          </Link>
        </div>
        <div className="streams-grid">
          {streams.map((stream, i) => {
            const Icon = icons[i];
            return (
              <Link
                href={`/universities?stream=${encodeURIComponent(stream)}`}
                className="stream"
                key={stream}
              >
                <span className={`stream-icon color-${i}`}>
                  <Icon size={25} strokeWidth={1.5} />
                </span>
                <h3>{stream}</h3>
                <p>{descriptions[i]}</p>
                <ArrowUpRight className="stream-arrow" size={16} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="soft-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A PLACE TO BELONG</p>
              <h2>Discover your next possibility.</h2>
              <p>Get to know the universities behind your shortlist.</p>
            </div>
            <Link className="button secondary" href="/universities">
              Explore universities <ArrowRight size={17} />
            </Link>
          </div>
          {universities.rows.length ? (
            <div className="university-grid">
              {universities.rows.map((c) => (
                <UniversityCard key={c.id} university={c} />
              ))}
            </div>
          ) : (
            <div className="launch-panel">
              <div>
                <span className="pill">THE DISCOVERY STARTS HERE</span>
                <h3>
                  Good decisions begin
                  <br />
                  with the right information.
                </h3>
                <p>
                  {s
                    ? "We’re preparing our institution directory. Verified university profiles, published course details, and campus photographs will appear here as institutions join."
                    : "Explore what matters: courses, campus life, and conversations with admissions teams. Bring your questions and build a shortlist around your goals."}
                </p>
              </div>
              <div className="directory-checklist">
                <p>
                  <span>01</span> Published course & fee information{" "}
                  <Check size={17} />
                </p>
                <p>
                  <span>02</span> Institution profiles reviewed before listing{" "}
                  <Check size={17} />
                </p>
                <p>
                  <span>03</span> Direct conversations with admissions teams{" "}
                  <Check size={17} />
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="container home-direction" id="how-it-works">
        <div className="home-direction-heading">
          <div>
            <p className="eyebrow">A LITTLE DIRECTION GOES A LONG WAY</p>
            <h2>
              You bring the ambition.
              <br />
              <em>Find your direction here.</em>
            </h2>
          </div>
          <Link className="text-link" href="/how-it-works">
            See how it works <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="home-direction-grid">
          <Link href="/courses" className="direction-card">
            <span className="direction-top">
              <Compass size={25} />
              <span>01 / DISCOVER</span>
            </span>
            <h3>What moves you?</h3>
            <p>
              Start with a subject you love. Find the courses that turn
              curiosity into possibility.
            </p>
            <span className="direction-link">
              Find your study path <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link href="/compare" className="direction-card">
            <span className="direction-top">
              <Building2 size={25} />
              <span>02 / CONSIDER</span>
            </span>
            <h3>What feels right?</h3>
            <p>
              Look beyond the name. Compare locations, published fees, and the
              details that matter.
            </p>
            <span className="direction-link">
              Compare your options <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link href="/how-it-works#student-journey" className="direction-card">
            <span className="direction-top">
              <Video size={25} />
              <span>03 / CONNECT</span>
            </span>
            <h3>What comes next?</h3>
            <p>
              Ask the questions on your mind. Learn how to arrange a
              conversation or a campus visit.
            </p>
            <span className="direction-link">
              Plan your next step <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
        <div className="home-principles">
          <span>
            <Check size={16} /> Your interests first
          </span>
          <span>
            <Check size={16} /> Published course information
          </span>
          <span>
            <Check size={16} /> Conversations with university teams
          </span>
        </div>
      </section>
      <section className="container campus-story">
        <div className="story-image">
          <img
            src="/images/campus-life.jpg"
            alt="Students studying together at a campus library"
            loading="lazy"
          />
          <span>MORE THAN A COURSE. A WHOLE NEW WORLD.</span>
        </div>
        <div className="story-copy">
          <p className="eyebrow">GET A FEEL FOR YOUR FUTURE</p>
          <h2>
            Find a place
            <br />
            that feels like you.
          </h2>
          <p>
            The library you’ll get lost in. The people you’ll learn alongside.
            The spaces where your ideas will grow. There’s more to choosing a
            university than a prospectus.
          </p>
          <p>
            Explore institution-provided photographs and virtual tours where
            available, then arrange a visit to see it for yourself.
          </p>
          <Link className="button" href="/universities">
            Explore campus life <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="container section faq-section">
        <div>
          <p className="eyebrow">A LITTLE MORE CLARITY</p>
          <h2>Questions? A good place to start.</h2>
          <p>Still curious about something?</p>
          <Link className="text-link" href="/contact">
            Get in touch <ArrowRight size={16} />
          </Link>
        </div>
        <div className="faqs">
          {[
            [
              "Who is this platform for?",
              "Students exploring their options after Class 12, their families, and university admissions teams. Register and log in to explore university profiles and use the portal.",
            ],
            [
              "How do I book a counselling session?",
              "Open a university profile, choose an available counselling slot, and send your questions. The institution reviews the request; your dashboard shows the confirmation and meeting link.",
            ],
            [
              "Does a verified profile guarantee admission?",
              "No. Verification refers to the institution review process. Eligibility, fees, and admission decisions remain with each institution. Confirm details directly before applying.",
            ],
            [
              "Can I visit a university before applying?",
              "When a university publishes campus-visit availability, you can request a time and specify your group size. Wait for confirmation before travelling.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="institution-band">
        <div className="container">
          <div>
            <p className="eyebrow">FOR UNIVERSITIES</p>
            <h2>Help the right students find you.</h2>
            <p>
              Tell your story. Start meaningful conversations. Welcome your next
              cohort.
            </p>
          </div>
          <Link className="button white" href="/register/institution">
            Register your institution <MoveUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
