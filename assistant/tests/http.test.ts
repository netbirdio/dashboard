import { beforeEach, expect, test } from "bun:test";
import { Hono } from "hono";
import { errorBoundary, requestId } from "@/middleware.ts";
import { type AppEnv, createApp } from "@/routes.ts";
import { setEnv } from "./env.ts";

const ALLOWED = "https://dash.netbird.io";

beforeEach(() => {
  setEnv({ ALLOWED_ORIGINS: ALLOWED });
});

test("preflight from an allowed origin gets the CORS headers", async () => {
  const app = createApp();
  const res = await app.request("/v1/chat", {
    method: "OPTIONS",
    headers: { Origin: ALLOWED, "Access-Control-Request-Method": "POST" },
  });
  expect(res.status).toBe(204);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
});

test("a disallowed browser origin is rejected with the cors code and its message", async () => {
  const app = createApp();
  const realError = console.error;
  console.error = () => {};
  try {
    const res = await app.request("/v1/chat", { headers: { Origin: "https://evil.io" } });
    expect(res.status).toBe(403);

    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe("cors");
    expect(body.message).toContain("refused this request's origin");
    // The rejected origin is for the operator's logs, not the response.
    expect(JSON.stringify(body)).not.toContain("evil.io");

    const preflight = await app.request("/v1/chat", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.io", "Access-Control-Request-Method": "POST" },
    });
    expect(preflight.status).toBe(403);
    expect(((await preflight.json()) as { code: string }).code).toBe("cors");
  } finally {
    console.error = realError;
  }
});

test("an allowed origin keeps its CORS headers even on a 401", async () => {
  const app = createApp();
  const res = await app.request("/v1/chat", { headers: { Origin: ALLOWED } });
  expect(res.status).toBe(401);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
});

// Hono routes handler errors to onError rather than through the middleware
// chain, so this pins two things: the boundary is reached at all, and the id
// stamped by requestId is still on the context when it runs.
test("a throwing handler becomes a 500 carrying the request id", async () => {
  // Wired the way createApp() wires it.
  const app = new Hono<AppEnv>();
  app.onError(errorBoundary);
  app.use("/boom", requestId);
  app.get("/boom", () => {
    throw new Error("kaboom: never reaches the caller");
  });

  const realError = console.error;
  console.error = () => {};
  try {
    const res = await app.request("/boom");
    expect(res.status).toBe(500);

    const body = (await res.json()) as { code: string; message: string; requestId?: string };
    expect(body.code).toBe("internal_error");
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    // The thrown message must not leak to the caller.
    expect(JSON.stringify(body)).not.toContain("kaboom");
  } finally {
    console.error = realError;
  }
});
