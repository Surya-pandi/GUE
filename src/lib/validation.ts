import { z } from "zod";
export const uuid = z.string().uuid();
export const email = z.email().max(254);
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
export function safeRedirect(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value)
    ? value
    : fallback;
}
export function safeExternal(
  value: string | null | undefined,
  hosts?: string[],
) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!hosts || hosts.includes(u.hostname))
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
export const meetingHosts = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
];
export const tourHosts = [
  "www.google.com",
  "maps.google.com",
  "www.youtube.com",
  "youtu.be",
  "my.matterport.com",
];
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
