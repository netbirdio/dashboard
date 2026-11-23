import { beforeEach, describe, expect, it, vi } from "vitest";
import { getScimBaseUrl } from "./netbird";

// The real config loader needs Next build-time files the unit env lacks.
const mockConfig = vi.hoisted(() => ({ apiOrigin: "" }));
vi.mock("@utils/config", () => ({ default: () => mockConfig }));

describe("getScimBaseUrl", () => {
  beforeEach(() => {
    mockConfig.apiOrigin = "";
  });

  it("uses NetBird Cloud's API origin on Cloud", () => {
    mockConfig.apiOrigin = "https://api.netbird.io";
    expect(getScimBaseUrl()).toBe("https://api.netbird.io/api/scim/v2");
  });

  it("uses the self-hosted API origin", () => {
    mockConfig.apiOrigin = "https://netbird.example.com";
    expect(getScimBaseUrl()).toBe("https://netbird.example.com/api/scim/v2");
  });

  it("drops a trailing slash from the API origin", () => {
    mockConfig.apiOrigin = "https://netbird.example.com:33073/";
    expect(getScimBaseUrl()).toBe(
      "https://netbird.example.com:33073/api/scim/v2",
    );
  });

  it("falls back to the page origin when no API origin is configured", () => {
    expect(getScimBaseUrl()).toBe(`${window.location.origin}/api/scim/v2`);
  });
});
