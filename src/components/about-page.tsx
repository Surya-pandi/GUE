import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Compass,
  MapPin,
  MessageCircle,
  GraduationCap,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Compass,
    title: "Explore your possibilities",
    text: "Discover universities and courses around your interests, preferred location, and budget.",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Have real conversations",
    text: "Connect with admissions representatives to ask about eligibility, fees, and campus life.",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "Choose with confidence",
    text: "Compare your shortlist, plan a campus visit, and take your next step with a clearer picture.",
  },
];

export function AboutPage() {
  return (
    <div className="about-page container">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero-copy">
          <p className="about-kicker">
            <span /> ABOUT GLOBAL UNIVERSITY EXPO
          </p>
          <h1 id="about-title">
            Big possibilities.
            <br />
            <em>A clearer path.</em>
          </h1>
          <p className="about-lead">
            Your next chapter starts with the right questions. We bring
            students, families, and universities closer to the answers.
          </p>
          <div className="about-hero-actions">
            <Link className="button" href="/universities">
              Explore universities <ArrowUpRight size={18} />
            </Link>
            <a className="about-office-link" href="#our-offices">
              Find our offices <ArrowRight size={17} />
            </a>
          </div>
          <div className="about-hero-footnote">DISCOVER. CONNECT. DECIDE.</div>
        </div>
        <div className="about-path-panel">
          <div className="about-path-top">
            <Compass size={22} />
            <span>YOUR NEXT CHAPTER</span>
          </div>
          <h2>
            From curiosity
            <br />
            to a clear direction.
          </h2>
          <ol className="about-path-list">
            <li>
              <span>01</span>
              <div>
                <strong>Find what inspires you</strong>
                <small>Universities & courses</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Meet the people behind it</strong>
                <small>Admissions conversations</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Picture yourself there</strong>
                <small>Campus visits & possibilities</small>
              </div>
            </li>
          </ol>
          <p>One important decision. Your own direction.</p>
        </div>
      </section>

      <section className="about-mission" aria-labelledby="about-mission-title">
        <div>
          <p className="about-kicker">WHY WE EXIST</p>
          <h2 id="about-mission-title">
            A meaningful choice
            <br />
            begins with clarity.
          </h2>
        </div>
        <div>
          <p>
            Choosing a university is about more than a course name. It is about
            the people you will meet, the place you will grow, and the future
            you want to build.
          </p>
          <p>
            Global University Expo helps students and families explore options
            after Class 12, understand published university information, and
            connect directly with admissions teams.
          </p>
        </div>
      </section>

      <section className="about-steps" aria-label="How we help you">
        {steps.map(({ number, icon: Icon, title, text }) => (
          <article className="about-step" key={number}>
            <div className="about-step-top">
              <Icon size={25} aria-hidden="true" />
              <span>{number}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <p className="about-review-note">
        University verification reviews profiles and supporting materials. It is
        not a ranking, accreditation, or guarantee of admission.
      </p>

      <section className="about-locations" aria-labelledby="our-offices">
        <div className="about-section-heading">
          <div>
            <p className="about-kicker">WHERE TO FIND US</p>
            <h2 id="our-offices">Two offices. One shared purpose.</h2>
          </div>
          <p>Connecting students with their next chapter.</p>
        </div>
        <div className="about-office-grid">
          <article className="about-office-card">
            <div className="about-office-top">
              <span>
                <Building2 size={18} /> Corporate office
              </span>
              <span className="about-office-number">01 /</span>
            </div>
            <h3>Gurugram</h3>
            <p className="about-office-region">New Delhi</p>
            <address>
              <strong>Global University Expo</strong>
              <br />
              Daksha Connecting Minds
              <br />
              304, Tower B, Emaar, Sector 65
              <br />
              Gurugram, New Delhi
            </address>
            <a
              href="https://www.google.com/maps/search/?api=1&query=304%20Tower%20B%20Emaar%20Sector%2065%20Gurugram"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Find the corporate office on Google Maps (opens in a new tab)"
            >
              <MapPin size={17} /> Find on Google Maps{" "}
              <ArrowUpRight size={17} />
            </a>
          </article>
          <article className="about-office-card">
            <div className="about-office-top">
              <span>
                <Building2 size={18} /> Administrative office
              </span>
              <span className="about-office-number">02 /</span>
            </div>
            <h3>Coimbatore</h3>
            <p className="about-office-region">641004</p>
            <address>
              No. 7, Second Cross
              <br />
              Tirumagalnagar
              <br />
              Coimbatore – 641004
            </address>
            <a
              href="https://www.google.com/maps/search/?api=1&query=No%207%20Second%20Cross%20Tirumagalnagar%20Coimbatore%20641004"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Find the administrative office on Google Maps (opens in a new tab)"
            >
              <MapPin size={17} /> Find on Google Maps{" "}
              <ArrowUpRight size={17} />
            </a>
          </article>
        </div>
      </section>

      <section className="about-next">
        <div>
          <p className="about-kicker">YOUR FUTURE, YOUR CHOICE</p>
          <h2>Let’s find your next chapter.</h2>
          <p>Start with your interests. Discover where they could take you.</p>
        </div>
        <Link className="button" href="/register/student">
          Start your journey <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
