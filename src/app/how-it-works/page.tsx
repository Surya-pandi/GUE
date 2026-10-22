import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  UserRound,
  Compass,
  MessagesSquare,
  MapPin,
  Check,
} from "lucide-react";

export const metadata = {
  title: "How it works",
  description:
    "From your student profile to university discovery, counselling and campus visits. Plan your next step with Global University Expo.",
};
const steps = [
  {
    icon: UserRound,
    title: "Make it personal",
    detail:
      "Register as a student and verify your email if prompted. Add your name, passing year, mobile and parent’s number to build your profile. Marks and cutoff are optional.",
    note: "Your profile comes before your dashboard.",
  },
  {
    icon: Compass,
    title: "Discover your options",
    detail:
      "Sign in to explore published university profiles and courses. Filter by your interests and location, save favourites, and compare up to four universities.",
    note: "Build a shortlist around what matters to you.",
  },
  {
    icon: MessagesSquare,
    title: "Start a conversation",
    detail:
      "Choose an available counselling slot and share your questions. The university reviews your request. Once confirmed, your dashboard shows the meeting details and link.",
    note: "A request becomes an appointment after confirmation.",
  },
  {
    icon: MapPin,
    title: "Experience the campus",
    detail:
      "Request an available campus-visit slot and tell the university your group size. Wait for confirmation before travelling, then use the visit to make a more informed choice.",
    note: "Your next chapter is yours to choose.",
  },
];

export default function HowItWorks() {
  return (
    <div className="container guide-page">
      <section className="guide-hero">
        <p className="eyebrow">HOW IT WORKS</p>
        <h1>
          A big decision.
          <br />
          <em>A clear way forward.</em>
        </h1>
        <p>
          From your first question to your first campus visit.
          <br />
          Take it one thoughtful step at a time.
        </p>
        <a className="text-link" href="#student-journey">
          Explore the student journey <ArrowRight size={18} />
        </a>
        <div className="guide-chapters">
          <span>01 / YOUR PROFILE</span>
          <span>02 / YOUR SHORTLIST</span>
          <span>03 / YOUR CONVERSATIONS</span>
          <span>04 / YOUR VISIT</span>
        </div>
      </section>
      <section
        id="student-journey"
        className="guide-steps"
        aria-label="The student journey"
      >
        {steps.map(({ icon: Icon, title, detail, note }, index) => (
          <article className="guide-step" key={title}>
            <span className="guide-number">0{index + 1}</span>
            <div className="guide-step-body">
              <Icon size={26} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{detail}</p>
              <span className="guide-note">
                <Check size={16} aria-hidden="true" />
                {note}
              </span>
            </div>
          </article>
        ))}
      </section>
      <section className="guide-expectations">
        <div>
          <p className="eyebrow">GOOD TO KNOW</p>
          <h2>
            Clear expectations.
            <br />
            Better decisions.
          </h2>
        </div>
        <div>
          <h3>Keep an eye on your dashboard</h3>
          <p>
            Track booking status and university responses in one place.
            Counselling uses a meeting link provided by the university.
          </p>
          <h3>Ask before you apply</h3>
          <p>
            Confirm fees, eligibility, and admission requirements directly with
            the university. Profile verification is a review of supporting
            information, not a ranking or admission guarantee.
          </p>
        </div>
      </section>
      <section className="about-next">
        <div>
          <p className="about-kicker">FOR STUDENTS</p>
          <h2>Your next chapter starts with you.</h2>
          <p>
            Create your student profile, discover universities, and connect with
            admissions teams to plan your future.
          </p>
        </div>
        <Link className="button" href="/register/student">
          Join as a student <ArrowUpRight size={18} />
        </Link>
      </section>
      <section className="about-next">
        <div>
          <p className="about-kicker">FOR UNIVERSITY TEAMS</p>
          <h2>Be part of someone’s next chapter.</h2>
          <p>
            Register your university, submit verification documents, and publish
            your profile after administrator approval.
          </p>
        </div>
        <Link className="button" href="/register/institution">
          Join as a university <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
