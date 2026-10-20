import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const pages = [
  "/",
  "/privacy",
  "/terms",
  "/login",
  "/admin/login",
  "/register/student",
  "/register/institution",
  "/forgot-password",
  "/robots.txt",
  "/sitemap.xml",
  "/images/desktop-poster.webp",
  "/images/mobile-poster.webp",
  "/images/global-university-expo.png",
  "/images/gue-logo.png",
  "/images/app-icon-192.png",
  "/images/app-icon-512.png",
  "/images/app-icon-maskable.png",
  "/images/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/sw.js",
];
for (const path of pages) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, 200, path);
  if (response.headers.get("content-type")?.includes("text/html")) {
    const html = await response.text();
    assert.ok(html.includes("<main"), `Main landmark: ${path}`);
    assert.ok(!html.includes("Internal Server Error"), path);
    assert.ok(html.includes("GLOBAL UNIVERSITY EXPO"), `Brand name: ${path}`);
    assert.ok(
      html.includes("/images/global-university-expo.png"),
      `Logo: ${path}`,
    );
    if (path === "/") {
      assert.ok(html.includes("Big dreams."), "Public landing hero");
      assert.ok(html.includes('id="how-it-works"'), "Public landing sections");
      assert.ok(
        html.includes("Log in to explore universities"),
        "University access requires login",
      );
      assert.ok(
        !html.includes('class="university-card"'),
        "No university records on the signed-out landing page",
      );
    }
  }
  console.log(`PASS ${path}`);
}
const manifest = await (await fetch(base + "/manifest.webmanifest")).json();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
const worker = await fetch(base + "/sw.js");
assert.match(worker.headers.get("content-type") || "", /javascript/);
assert.match(worker.headers.get("cache-control") || "", /no-store/);
const offline = await fetch(base + "/offline.html", { redirect: "manual" });
assert.equal(offline.status, 200, "Offline screen works without login");
assert.ok((await offline.text()).includes("You're offline."));
for (const path of [
  "/universities",
  "/universities?stream=Engineering&city=Chennai",
  "/universities/not-a-real-university",
  "/universities/example/book",
  "/courses",
  "/compare",
  "/about",
  "/contact",
  "/for-institutions",
  "/counselling",
  "/student/dashboard",
  "/institution/dashboard",
  "/admin/dashboard",
  "/admin/dashboard/institutions",
  "/admin/dashboard/removed",
  "/admin/dashboard/students",
  "/admin/review/00000000-0000-4000-8000-000000000001",
  "/dashboard",
  "/reset-password",
]) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.ok(
    [307, 308].includes(response.status),
    `${path}: ${response.status}`,
  );
  const destination = new URL(response.headers.get("location"), base);
  assert.equal(
    destination.pathname,
    path.startsWith("/admin/") ? "/admin/login" : "/login",
  );
  assert.equal(destination.searchParams.get("next"), path);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  console.log(`PASS auth redirect ${path}`);
}
for (const path of [
  "/api/reports",
  "/api/search?q=university",
  "/api/cron/email",
  "/api/documents/00000000-0000-4000-8000-000000000001",
]) {
  assert.equal((await fetch(base + path)).status, 401);
  console.log(`PASS API authorization ${path}`);
}
assert.equal(
  (await fetch(base + "/api/uploads", { method: "POST" })).status,
  401,
);
const forged = await fetch(base + "/universities", {
  redirect: "manual",
  headers: { Cookie: "authenticated=true; session=fake" },
});
assert.equal(forged.status, 307, "Client cookies cannot bypass authentication");
const destination = "/universities?stream=Engineering&city=Chennai";
const login = await (
  await fetch(base + "/login?next=" + encodeURIComponent(destination))
).text();
assert.ok(
  login.includes(encodeURIComponent(destination)),
  "Login retains the destination in registration link",
);
const registration = await (
  await fetch(
    base + "/register/student?next=" + encodeURIComponent(destination),
  )
).text();
assert.ok(
  registration.includes(encodeURIComponent(destination)),
  "Registration retains the destination in login link",
);
const callback = await fetch(base + "/auth/callback", { redirect: "manual" });
assert.equal(
  new URL(callback.headers.get("location"), base).pathname,
  "/login",
);
const sitemap = await (await fetch(base + "/sitemap.xml")).text();
assert.ok(
  !sitemap.includes("/universities"),
  "Sitemap does not expose protected discovery pages",
);
console.log(
  "HTTP smoke checks passed: branding, public routes, protected pages/APIs, and auth handoff.",
);
