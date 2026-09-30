import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The vault restore is identity here: what is under test is the gate, not
// tokenisation, and the real hook needs the assistant provider.
vi.mock("@netbird/assistant-react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@netbird/assistant-react",
  );
  return { ...actual, useVaultRestore: () => (text: string) => text };
});

const { AssistantApprovalCard } = await import("./AssistantApprovalCard");

const request = (overrides = {}) => ({
  requestId: "req-1",
  kind: "tool-approval",
  prompt: "Approve tool call: docs_search",
  toolName: "docs_search",
  options: [
    { id: "approve", label: "Approve", style: "primary" as const },
    { id: "cancel", label: "Cancel", style: "danger" as const },
  ],
  ...overrides,
});

/**
 * A question eve raised for a value the model could not enumerate: `text`
 * display, no options. The shape `ask_question` produces when it is asked for
 * a CIDR rather than a choice.
 */
const question = (overrides = {}) => ({
  requestId: "req-2",
  kind: "question",
  prompt: "What's the CIDR range of the AWS VPC subnet?",
  toolName: "ask_question",
  display: "text" as const,
  options: [],
  ...overrides,
});

afterEach(cleanup);

describe("AssistantApprovalCard", () => {
  it("names the tool the way the rest of the thread does", () => {
    // the framework's prompt carries the wire name; the manifest label is
    // what the activity trail shows, so the two must not disagree.
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

    expect(screen.getByText(/Read the docs/)).toBeTruthy();
    expect(screen.queryByText(/docs_search/)).toBeNull();
  });

  it("relabels a tool approval as a single-call grant", () => {
    // the framework's own labels are "Approve"/"Cancel"; what this actually
    // grants is one call, and the copy has to say so.
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

    expect(screen.getByText("Allow Once")).toBeTruthy();
    expect(screen.getByText("Deny")).toBeTruthy();
  });

  it("answers with the option id the framework is waiting for", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);

    fireEvent.click(screen.getByText("Allow Once"));
    expect(onRespond).toHaveBeenCalledWith("approve");
  });

  it("puts deny before allow, whatever order the framework listed them in", () => {
    // Enter is bound to the rightmost button, so the destructive half of the
    // pair must never be the one a reflex lands on.
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(["Deny", "Allow Once"]);
  });

  it("binds Enter to allow and Escape to deny", () => {
    const onRespond = vi.fn();
    const { unmount } = render(
      <AssistantApprovalCard request={request()} onRespond={onRespond} />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onRespond).toHaveBeenCalledWith("approve");
    unmount();

    const deny = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={deny} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(deny).toHaveBeenCalledWith("cancel");
  });

  it("latches after the first answer", () => {
    // The session is parked until the response lands, so a second answer would
    // post to a request the framework has already resolved.
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByText("Deny"));
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("takes a typed answer for a question with no options", () => {
    // The case that used to dead-end: a value the model cannot enumerate, so
    // eve raises a `text` question and there is no option to click.
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard
        request={question()}
        onRespond={onRespond}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: " 10.0.0.0/16 " },
    });
    fireEvent.click(screen.getByText("Send"));
    // Trimmed, because the answer goes to the model as written.
    expect(onRespond).toHaveBeenCalledWith({ text: "10.0.0.0/16" });
  });

  it("sends on Enter and keeps Shift+Enter for a line break", () => {
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard request={question()} onRespond={onRespond} />,
    );

    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "10.0.0.0/16" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onRespond).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: "Enter" });
    expect(onRespond).toHaveBeenCalledWith({ text: "10.0.0.0/16" });
  });

  it("refuses to send an empty answer", () => {
    // eve parks until it gets one, so a blank send would resolve the request
    // with nothing and leave the model to guess anyway.
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard request={question()} onRespond={onRespond} />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("offers both the options and a box when the model allows freeform", () => {
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard
        request={question({
          display: "select",
          allowFreeform: true,
          options: [
            { id: "prod", label: "Production" },
            { id: "staging", label: "Staging" },
          ],
        })}
        onRespond={onRespond}
      />,
    );

    expect(screen.getByRole("textbox")).toBeTruthy();
    fireEvent.click(screen.getByText("Staging"));
    expect(onRespond).toHaveBeenCalledWith("staging");
  });

  it("puts no text box on an approval", () => {
    // An approval is a choice between the options eve minted; typed text has
    // nowhere to go, and a box would invite an answer the framework refuses.
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("leaves Enter to the answer being typed", () => {
    // The window binding sends the affirmative option; with a box on screen
    // that would fire while someone is still typing into it.
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard
        request={question({
          display: "select",
          allowFreeform: true,
          options: [{ id: "prod", label: "Production" }],
        })}
        onRespond={onRespond}
      />,
    );

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("latches a typed answer too", () => {
    const onRespond = vi.fn();
    render(
      <AssistantApprovalCard request={question()} onRespond={onRespond} />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("falls back to the framework's own prompt for a pause with no tool", () => {
    render(
      <AssistantApprovalCard
        request={request({
          kind: "session-limit",
          toolName: undefined,
          prompt: "This conversation reached its token budget.",
        })}
        onRespond={vi.fn()}
      />,
    );
    expect(
      screen.getByText("This conversation reached its token budget."),
    ).toBeTruthy();
    // Not a tool call, so the framework's own option labels stand.
    expect(screen.getByText("Approve")).toBeTruthy();
  });
});
