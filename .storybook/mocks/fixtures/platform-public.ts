import type { Handler, HandlerContext } from "./index";

/* Unauthenticated endpoints of the public pages (/invite, /setup). */
export const publicFixtures: Record<string, Handler> = {
  "GET /users/invites/:token": ({ path }: HandlerContext) =>
    path.endsWith("/expired")
      ? {
          email: "oscar@agency.example",
          name: "Oscar Old",
          expires_at: "2026-09-30T12:00:00Z",
          valid: false,
          invited_by: "Olivia Owner",
        }
      : {
          email: "nora.new-hire@netbird.io",
          name: "Nora New-Hire",
          expires_at: "2026-10-15T12:00:00Z",
          valid: true,
          invited_by: "Olivia Owner",
        },
};
