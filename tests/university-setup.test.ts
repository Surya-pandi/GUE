import test from "node:test";
import assert from "node:assert/strict";
import { availableSetupStep } from "../src/lib/university-setup";

test("setup resumes at the first missing requirement and finishes at gallery without documents", () => {
  const status = {
    profile: false,
    courses: false,
    gallery: false,
    documents: false,
    complete: false,
  };
  assert.equal(availableSetupStep(status), 0);
  status.profile = true;
  assert.equal(availableSetupStep(status), 1);
  status.courses = true;
  assert.equal(availableSetupStep(status), 2);
  status.gallery = true;
  assert.equal(availableSetupStep(status), 2);
  status.documents = true;
  assert.equal(availableSetupStep(status), 2);
  status.courses = false;
  assert.equal(availableSetupStep(status), 1);
});
