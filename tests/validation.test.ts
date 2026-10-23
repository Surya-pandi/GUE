import test from "node:test";
import assert from "node:assert/strict";
import {
  safeRedirect,
  safeExternal,
  meetingHosts,
  tourHosts,
  csvCell,
} from "../src/lib/validation";
test("redirects reject external, protocol-relative and backslash URLs", () => {
  for (const input of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/path\nLocation: bad",
  ])
    assert.equal(safeRedirect(input), "/dashboard");
  assert.equal(
    safeRedirect("/student/dashboard?tab=1"),
    "/student/dashboard?tab=1",
  );
});
test("external meeting links require HTTPS and exact approved hosts", () => {
  for (const input of [
    "javascript:alert(1)",
    "http://meet.google.com/abc",
    "https://meet.google.com.evil.test/abc",
    "https://user:pass@meet.google.com/abc",
  ])
    assert.equal(safeExternal(input, meetingHosts), null);
  assert.equal(
    safeExternal("https://meet.google.com/abc-defg-hij", meetingHosts),
    "https://meet.google.com/abc-defg-hij",
  );
});
test("CSV quotes data and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell("=CMD()"), '"\'=CMD()"');
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell(" normal"), '" normal"');
  assert.equal(csvCell("\t+2"), '"\'\t+2"');
});

test("tour links accept Maps short links but reject lookalike domains and unsafe URLs", () => {
  assert.equal(
    safeExternal("https://maps.app.goo.gl/example", tourHosts),
    "https://maps.app.goo.gl/example",
  );
  for (const url of [
    "http://maps.app.goo.gl/example",
    "https://maps.app.goo.gl.evil.test/example",
    "https://maps.app.goo.gl@evil.test/example",
  ])
    assert.equal(safeExternal(url, tourHosts), null);
});
