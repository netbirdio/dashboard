import { describe, expect, it } from "vitest";
import { brandAssetUrl, brandedTitle, deploymentBranding } from "./branding";

describe("brandAssetUrl", () => {
  it.each([
    "https://example.com/logo.svg",
    "http://localhost:8080/logo.png",
    "/branding/logo.svg",
  ])("keeps %j", (url) => {
    expect(brandAssetUrl(url)).toBe(url);
  });

  it("trims surrounding whitespace", () => {
    expect(brandAssetUrl("  /branding/logo.svg ")).toBe("/branding/logo.svg");
  });

  it.each([
    undefined,
    "",
    "   ",
    "logo.svg",
    "//example.com/logo.svg",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "$NETBIRD_BRAND_LOGO_URL",
  ])("drops %j", (url) => {
    expect(brandAssetUrl(url)).toBeUndefined();
  });
});

describe("deploymentBranding", () => {
  it("is empty when nothing is set", () => {
    expect(deploymentBranding()).toEqual({
      name: undefined,
      logoUrl: undefined,
      faviconUrl: undefined,
    });
    expect(deploymentBranding("", " ", "")).toEqual(deploymentBranding());
  });

  it("keeps each part independently", () => {
    expect(
      deploymentBranding(" Acme Access ", "not a url", "/branding/icon.png"),
    ).toEqual({
      name: "Acme Access",
      logoUrl: undefined,
      faviconUrl: "/branding/icon.png",
    });
  });
});

describe("brandedTitle", () => {
  it("leaves the title alone without a name", () => {
    expect(brandedTitle("Peers - NetBird Dashboard")).toBe(
      "Peers - NetBird Dashboard",
    );
  });

  it("replaces the product name", () => {
    expect(brandedTitle("Peers - NetBird Dashboard", "Acme Access")).toBe(
      "Peers - Acme Access",
    );
    expect(brandedTitle("NetBird Dashboard", "Acme Access")).toBe(
      "Acme Access",
    );
  });

  it("leaves a title without the product name alone", () => {
    expect(brandedTitle("Something else", "Acme Access")).toBe(
      "Something else",
    );
  });
});
