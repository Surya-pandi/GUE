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
import { CollegeCard } from "@/components/college-card";
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
  const colleges = s ? await institutions({}, 3) : { rows: [] };
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
          <Link className="campus-hero-link" href="/colleges">
            Find your college <ArrowUpRight size={20} />
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
              href={s ? "/colleges" : "/register/student?next=/colleges"}
            >
              {s ? "Explore your possibilities" : "Start your journey"}{" "}
              <ArrowUpRight size={20} />
            </Link>
            <span className="future-note">
              {s
                ? "Make your next move with confidence."
                : "Create an account to unlock university discovery."}
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
                href: "/colleges",
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
                href={`/colleges?stream=${encodeURIComponent(stream)}`}
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
              <p>Get to know the colleges behind your shortlist.</p>
            </div>
            <Link className="button secondary" href="/colleges">
              Explore colleges <ArrowRight size={17} />
            </Link>
          </div>
          {colleges.rows.length ? (
            <div className="college-grid">
              {colleges.rows.map((c) => (
                <CollegeCard key={c.id} college={c} />
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
                    ? "We’re preparing our institution directory. Verified college profiles, published course details, and campus photographs will appear here as institutions join."
                    : "Register or log in to explore university profiles, compare courses, and connect with admissions teams."}
                </p>
                {!s && (
                  <Link className="button" href="/login?next=/colleges">
                    Log in to explore universities <ArrowRight size={17} />
                  </Link>
                )}
                <Link className="text-link" href="/register/student">
                  Start your student account <ArrowRight size={17} />
                </Link>
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
                <Link href="/register/institution">
                  Represent a college? Join the directory{" "}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="container section journey" id="how-it-works">
        <div className="journey-intro">
          <p className="eyebrow">LESS GUESSWORK. MORE CLARITY.</p>
          <h2>
            A big decision.
            <br />A few simple steps.
          </h2>
          <p>
            You don’t have to have it all figured out. Start with what interests
            you, and take it one conversation at a time.
          </p>
          <Link className="text-link" href="/counselling">
            How counselling works <ArrowRight size={17} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              Compass,
              "Find your possibilities",
              "Explore colleges by course, location, fees, and the things that matter to you.",
            ],
            [
              Video,
              "Have a real conversation",
              "Choose an available session and bring your questions to an admissions representative.",
            ],
            [
              Building2,
              "Picture yourself there",
              "Request a campus visit, explore the surroundings, and make a more informed choice.",
            ],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Compass;
            return (
              <div className="step" key={String(title)}>
                <span className="step-number">0{i + 1}</span>
                <I size={25} strokeWidth={1.5} />
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                </div>
              </div>
            );
          })}
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
            college than a prospectus.
          </p>
          <p>
            Explore institution-provided photographs and virtual tours where
            available, then arrange a visit to see it for yourself.
          </p>
          <Link className="button" href="/colleges">
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
              "Students exploring their options after Class 12, their families, and college admissions teams. Register and log in to explore university profiles and use the portal.",
            ],
            [
              "How do I book a counselling session?",
              "Open a college profile, choose an available counselling slot, and send your questions. The institution reviews the request; your dashboard shows the confirmation and meeting link.",
            ],
            [
              "Does a verified profile guarantee admission?",
              "No. Verification refers to the institution review process. Eligibility, fees, and admission decisions remain with each institution. Confirm details directly before applying.",
            ],
            [
              "Can I visit a college before applying?",
              "When a college publishes campus-visit availability, you can request a time and specify your group size. Wait for confirmation before travelling.",
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
            <p className="eyebrow">FOR COLLEGES & UNIVERSITIES</p>
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
