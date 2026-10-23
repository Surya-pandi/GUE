import test from "node:test";
import assert from "node:assert/strict";
import { uploadBatch } from "../src/lib/upload-batch";

test("bulk upload waits for each file and only requests setup completion on the final success", async () => {
  const calls: [string, boolean][] = [];
  const reported: number[] = [];
  let running = false;
  const results = await uploadBatch(
    ["one", "two", "three"],
    async (file, finish) => {
      assert.equal(running, false);
      running = true;
      await Promise.resolve();
      calls.push([file, finish]);
      running = false;
      return { ok: true, message: "Uploaded" };
    },
    (index) => reported.push(index),
  );
  assert.deepEqual(calls, [
    ["one", false],
    ["two", false],
    ["three", true],
  ]);
  assert.deepEqual(reported, [0, 1, 2]);
  assert.equal(
    results.every((item) => item.ok),
    true,
  );
});

test("partial failures continue remaining files and prevent automatic setup completion", async () => {
  const finishFlags: boolean[] = [];
  const results = await uploadBatch(
    ["bad", "good"],
    async (file, finish) => {
      finishFlags.push(finish);
      return { ok: file === "good", retryable: true, message: file };
    },
    () => {},
  );
  assert.deepEqual(finishFlags, [false, false]);
  assert.equal(results[0].ok, false);
  assert.equal(results[1].ok, true);
});

test("uncertain network failures are not automatically retried", async () => {
  const results = await uploadBatch(
    [1, 2],
    async (file) => {
      if (file === 1) throw new Error("Connection lost after sending");
      return { ok: true, message: "Uploaded" };
    },
    () => {},
  );
  assert.equal(results[0].retryable, false);
  assert.match(results[0].message, /may have been received/);
  assert.equal(results[1].ok, true);
});
