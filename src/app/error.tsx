"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again. If the problem continues, come back in a few minutes.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
