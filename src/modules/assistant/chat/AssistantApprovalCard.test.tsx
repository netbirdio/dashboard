import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantApprovalCard } from "./AssistantApprovalCard";

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

afterEach(cleanup);

describe("AssistantApprovalCard", () => {
  it("names the tool the way the rest of the thread does", () => {
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

    expect(screen.getByText(/Read the docs/)).toBeTruthy();
    expect(screen.queryByText(/docs_search/)).toBeNull();
  });

  it("relabels a tool approval as a single-call grant", () => {
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
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByText("Deny"));
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
    expect(screen.getByText("Approve")).toBeTruthy();
  });

  it("shows a lone danger option once, as the length limit's Stop is", () => {
    render(
      <AssistantApprovalCard
        request={request({
          kind: "session-limit",
          toolName: undefined,
          prompt: "This chat is too long. Start a new one to continue.",
          options: [{ id: "stop", label: "Stop", style: "danger" }],
        })}
        onRespond={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Stop" })).toHaveLength(1);
  });

  it("offers New chat beside Stop at the length limit, on the right and on Enter", () => {
    const onRespond = vi.fn();
    const onNewChat = vi.fn();
    render(
      <AssistantApprovalCard
        request={request({
          kind: "session-limit",
          toolName: undefined,
          prompt: "This chat is too long. Start a new one to continue.",
          options: [{ id: "stop", label: "Stop", style: "danger" }],
        })}
        onRespond={onRespond}
        onNewChat={onNewChat}
      />,
    );
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Stop", "New chat"]);
    fireEvent.keyDown(globalThis.window, { key: "Enter" });
    expect(onNewChat).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(globalThis.window, { key: "Escape" });
    expect(onRespond).toHaveBeenCalledWith("stop");
  });
});
