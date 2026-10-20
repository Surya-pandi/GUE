import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker(online: boolean) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cached: string[] = [];
  const offline = new Response("Offline screen");
  const live = new Response("Private account content");
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://gue.test" },
      addEventListener: (type: string, callback: (event: unknown) => void) => {
        handlers[type] = callback;
      },
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        add: async (url: string) => {
          cached.push(url);
        },
      }),
      match: async () => offline,
    },
    fetch: async () => {
      if (!online) throw new Error("Offline");
      return live;
    },
    URL,
    Response,
  });
  return { handlers, cached, offline, live };
}

test("offline cache contains only the generic fallback, never account content", async () => {
  const w = worker(true);
  let pending: Promise<unknown> | undefined;
  w.handlers.install({
    waitUntil: (value: Promise<unknown>) => {
      pending = value;
    },
  });
  await pending;
  assert.deepEqual(w.cached, ["/offline.html"]);
  let response: Promise<Response> | undefined;
  w.handlers.fetch({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://gue.test/student/dashboard",
    },
    respondWith: (value: Promise<Response>) => {
      response = value;
    },
  });
  assert.equal(await response, w.live);
  assert.deepEqual(w.cached, ["/offline.html"]);
});

test("failed page navigation shows the offline screen", async () => {
  const w = worker(false);
  let response: Promise<Response> | undefined;
  w.handlers.fetch({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://gue.test/universities",
    },
    respondWith: (value: Promise<Response>) => {
      response = value;
    },
  });
  assert.equal(await response, w.offline);
});

test("service worker leaves API calls, submissions, assets and external requests alone", () => {
  const w = worker(false);
  for (const request of [
    { method: "POST", mode: "navigate", url: "https://gue.test/login" },
    {
      method: "GET",
      mode: "navigate",
      url: "https://gue.test/api/documents/123",
    },
    { method: "GET", mode: "cors", url: "https://gue.test/api/search" },
    {
      method: "GET",
      mode: "no-cors",
      url: "https://gue.test/videos/desktop-intro.mp4",
    },
    { method: "GET", mode: "navigate", url: "https://other.test/" },
  ]) {
    w.handlers.fetch({
      request,
      respondWith: () => assert.fail(`Intercepted ${request.url}`),
    });
  }
});
