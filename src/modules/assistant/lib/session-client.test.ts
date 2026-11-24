import { describe, expect, it } from "vitest";
import { serverFailure } from "./session-client";

describe("serverFailure", () => {
  it("shows the server's text for a coded failure", () => {
    expect(serverFailure(403, JSON.stringify({ code: "session_unavailable", message: "Gone." }))).toEqual({
      code: "session_unavailable",
      message: "Gone.",
    });
  });

  it("falls back to fixed text for a body that only resembles one", () => {
    const fallback = serverFailure(502, "<html>");
    expect(serverFailure(502, JSON.stringify({ code: 502, message: "upstream connect error" }))).toEqual(fallback);
    expect(serverFailure(502, JSON.stringify({ code: "x", message: {} }))).toEqual(fallback);
  });
});
