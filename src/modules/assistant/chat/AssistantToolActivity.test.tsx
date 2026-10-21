import { cleanup, fireEvent, render } from "@testing-library/react";
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
  it("names a skill load in words, not as its internal id", () => {
    const text = rowText("assistant__skill", { name: "agent-network" });

    expect(text).toContain("Load skill 'Agent Network'");
    // The id the label was built from must not follow it: the SDK says this
    // row has no subject precisely so the slug is not repeated.
    expect(text).not.toContain("agent-network");
    expect(text).not.toContain("assistant__skill");
  });

  it("shows only the request when the output was kept for the model", () => {
    // A guide or docs page streams as a stub: there is no result to open.
    const { container, getByRole } = render(
      <AssistantToolActivity
        toolName="docs_search"
        args={{ query: "posture checks" }}
        result={{ omitted: true }}
        status={{ type: "complete" }}
      />,
    );
    fireEvent.click(getByRole("button"));
    const text = (container.textContent ?? "").replace(/\s+/g, " ");

    expect(text).toContain("Request");
    expect(text).not.toContain("Result");
    expect(text).not.toContain("omitted");
  });

  it("names a skill load the same under the framework's own tool name", () => {
    // A load projected from the action kind reaches the row as `eve__skill`,
    // which the channel's rename never sees. It must not read "Eve skill".
    const text = rowText("eve__skill", { name: "agent-network" });

    expect(text).toContain("Load skill 'Agent Network'");
    expect(text).not.toMatch(/\beve\b/i);
  });

  it("names every name a lookup searched for", () => {
    const text = rowText("account_search", { terms: ["developers", "AWS"] });

    expect(text).toContain("Look up 'developers', 'AWS'");
  });

  it("names an API read by its operation, not the operation's id", () => {
    const text = rowText("netbird_api", {
      operation: "get_api_peers_peerId",
      id: "d1ppv2rl0ubs73c9ruhg",
    });

    expect(text).toContain("Read peer details 'd1ppv2rl0ubs73c9ruhg'");
    expect(text).not.toContain("get_api_peers_peerId");
  });

  it("still lets the host name the subject for every other tool", () => {
    // The generic first-string rule, which the SDK deliberately does not
    // override — a search term is the user's own words, not a title to prettify.
    const text = rowText("audit_events", { search: "Office-Router" });

    expect(text).toContain("Read activity events 'Office-Router'");
  });
});
