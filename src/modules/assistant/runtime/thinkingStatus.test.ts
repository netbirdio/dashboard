import { describe, expect, it } from "vitest";
import { thinkingStatus } from "./thinkingStatus";

describe("thinkingStatus", () => {
  it("shows the sentence being written, not the whole stream", () => {
    expect(
      thinkingStatus(
        "The user wants office access. Now I'm checking which peers can route that network",
      ),
    ).toBe("Checking which peers can route that network");
  });

  it("drops the filler most reasoning starts with", () => {
    expect(thinkingStatus("Okay, let me look at the access policies")).toBe(
      "Look at the access policies",
    );
  });

  it("prefers the unfinished fragment over the sentence before it", () => {
    expect(
      thinkingStatus("I read the peers. Comparing them to the groups now"),
    ).toBe("Comparing them to the groups now");
  });

  it("treats newlines as boundaries", () => {
    expect(
      thinkingStatus("Plan:\n- read the peers\nMatching the address to a peer"),
    ).toBe("Matching the address to a peer");
  });

  it("clips a long clause at a word boundary", () => {
    const line = thinkingStatus(
      "Working out whether the destination group already contains every one of those resources or not",
    );
    expect(line).toBe("Working out whether the destination group already…");
    expect(line!.length).toBeLessThanOrEqual(53);
  });

  it("says nothing for a fragment too short to mean anything", () => {
    expect(thinkingStatus("Wait")).toBeNull();
    expect(thinkingStatus("Yes. Hmm")).toBeNull();
    expect(thinkingStatus("")).toBeNull();
  });

  it("restores placeholders so the line names the real thing", () => {
    const restore = (text: string) =>
      text.replace("{PEER_3}", "eduards-macbook");
    expect(
      thinkingStatus("I need to check whether {PEER_3} is online", restore),
    ).toBe("Check whether eduards-macbook is online");
  });

  it("never ends on a dangling comma", () => {
    expect(thinkingStatus("Reading the groups first, then the policies")).toBe(
      "Reading the groups first, then the policies",
    );
    expect(
      thinkingStatus(
        "Reading the groups and the policies and the networks, then deciding what to draw",
      ),
    ).toBe("Reading the groups and the policies and the…");
  });
});
