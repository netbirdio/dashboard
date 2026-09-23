import { describe, expect, it } from "vitest";
import { deploymentAnnouncement } from "./announcement";

describe("deploymentAnnouncement", () => {
  it.each([undefined, "", "   ", "\n"])(
    "is absent for blank text (%j)",
    (text) => {
      expect(deploymentAnnouncement(text)).toBeUndefined();
    },
  );

  it("is a permanent, prominent announcement for every edition", () => {
    expect(
      deploymentAnnouncement("  Connected to management replica mgmt-1 "),
    ).toEqual({
      tag: "",
      text: "Connected to management replica mgmt-1",
      variant: "important",
      closeable: false,
      isCloudOnly: false,
    });
  });
});
