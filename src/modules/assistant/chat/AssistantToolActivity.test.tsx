import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Identity restore: what is under test is how a row reads, not tokenisation,
// and the real hook needs the assistant provider.
vi.mock("@netbird/assistant-react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@netbird/assistant-react",
  );
  return { ...actual, useVaultRestore: () => (text: string) => text };
});

const { AssistantToolActivity } = await import("./AssistantToolActivity");

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

    expect(text).toContain("Loading the Agent Network skill");
    // The id the label was built from must not follow it: the SDK says this
    // row has no subject precisely so the slug is not repeated.
    expect(text).not.toContain("agent-network");
    expect(text).not.toContain("eve:load-skill");
  });

  it("names the connection it is searching", () => {
    const text = rowText("connection_search", {
      connection: "management",
      keywords: "peers",
    });

    expect(text).toContain("Searching connection 'Management'");
    // The keywords are what the host's first-string rule would have quoted.
    expect(text).not.toContain("peers");
  });

  it("still lets the host name the subject for every other tool", () => {
    // The generic first-string rule, which the SDK deliberately does not
    // override — a peer's hostname is an identifier, not a title to prettify.
    const text = rowText("ssh_exec", {
      peer: "MacBook-Pro-von-Eduard.local",
      command: "ls",
    });

    expect(text).toContain("Running a command 'MacBook-Pro-von-Eduard.local'");
  });
});
