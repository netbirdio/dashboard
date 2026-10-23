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
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          valid: true,
          invited_by: "Olivia Owner",
        },
};
