import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantToolActivity } from "./AssistantToolActivity";

/*
  The row's text, collapsed. The label, its subject and the truncation ellipsis
  are separate nodes, so a single getByText would only ever match part of the
  phrase this is all about.
*/
const rowText = (toolName: string, args: unknown): string => {
  const { container } = render(
    <AssistantToolActivity
      toolName={toolName}
      args={args}
      status={{ type: "running" }}
    />,
  );
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
};

afterEach(cleanup);

describe("AssistantToolActivity", () => {
  it("names a skill load in words, not as eve's internal id", () => {
    const text = rowText("eve:load-skill", { skill: "agent-network" });

    expect(text).toContain("Loading the 'Agent Network' skill");
    // The id the label was built from must not follow it: the SDK says this
    // row has no subject precisely so the slug is not repeated.
    expect(text).not.toContain("agent-network");
    expect(text).not.toContain("eve:load-skill");
  });

  it("names an API read by its operation, not the operation's id", () => {
    const text = rowText("netbird_api", {
      operation: "get_api_peers_peerId",
      id: "d1ppv2rl0ubs73c9ruhg",
    });

    expect(text).toContain("Reading peer details 'd1ppv2rl0ubs73c9ruhg'");
    expect(text).not.toContain("get_api_peers_peerId");
  });

  it("still lets the host name the subject for every other tool", () => {
    // The generic first-string rule, which the SDK deliberately does not
    // override — a search term is the user's own words, not a title to prettify.
    const text = rowText("audit_events", { search: "Office-Router" });

    expect(text).toContain("Reading activity events 'Office-Router'");
  });
});
