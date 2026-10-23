import { safeRedirect } from "./validation";

// Account type is an onboarding preference only. Database roles remain the
// authority for access; user metadata must never grant university/admin rights.
export function accountDestination(
  role: string,
  accountType: unknown,
  requested?: string,
) {
  const next = safeRedirect(requested);
  const path = next.split(/[?#]/)[0].replace(/\/+$/, "");
  if (role === "student" && accountType === "institution")
    return "/register/institution?step=application";
  if (
    ["/dashboard", "/login", "/register", "/register/institution"].includes(
      path,
    )
  ) {
    if (role === "super_admin") return "/admin/dashboard";
    if (role.startsWith("institution_")) return "/institution/dashboard";
    return "/student/dashboard";
  }
  return next;
}

export function isConnectionFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /fetch failed|failed to fetch|networkerror|network request failed|connect timeout/i.test(
    message,
  );
}

export const connectionMessage =
  "Unable to connect to account services. Please check your connection and try again. If you already submitted registration, try logging in before creating the account again.";
