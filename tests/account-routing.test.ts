import test from "node:test";
import assert from "node:assert/strict";
import {
  accountDestination,
  isConnectionFailure,
} from "../src/lib/account-routing";

test("university representatives resume their application before receiving an owner role", () => {
  assert.equal(
    accountDestination("student", "institution"),
    "/register/institution?step=application",
  );
  assert.equal(
    accountDestination("student", "institution", "/universities"),
    "/register/institution?step=application",
  );
  assert.equal(
    accountDestination("institution_owner", "institution"),
    "/institution/dashboard",
  );
  assert.equal(
    accountDestination("institution_staff", "institution"),
    "/institution/dashboard",
  );
  assert.equal(
    accountDestination(
      "institution_owner",
      "institution",
      "/register/institution?step=application",
    ),
    "/institution/dashboard",
  );
});

test("routing respects roles and safe destinations without granting access from metadata", () => {
  assert.equal(accountDestination("student", "student"), "/student/dashboard");
  assert.equal(
    accountDestination("student", "super_admin"),
    "/student/dashboard",
  );
  assert.equal(
    accountDestination("super_admin", "institution"),
    "/admin/dashboard",
  );
  assert.equal(
    accountDestination("student", "student", "/universities?city=Chennai"),
    "/universities?city=Chennai",
  );
  assert.equal(
    accountDestination("student", "student", "https://example.com"),
    "/student/dashboard",
  );
});

test("connection errors are distinguished from bad credentials", () => {
  assert.ok(isConnectionFailure(new TypeError("fetch failed")));
  assert.equal(
    isConnectionFailure(new Error("Invalid login credentials")),
    false,
  );
});
