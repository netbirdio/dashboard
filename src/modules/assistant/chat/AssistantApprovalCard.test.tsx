import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantApprovalCard, AssistantApprovalGate } from "./AssistantApprovalCard";
import { ARMING_DELAY_MS } from "./useArmingDelay";

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

const arm = () => act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS));

class ResizeObserverStub {
  observed: Element[] = [];
  disconnected = false;

  constructor(readonly resize: () => void) {
    observers.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }
}

let observers: ResizeObserverStub[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
    arm();

    fireEvent.click(screen.getByText("Allow Once"));
    expect(onRespond).toHaveBeenCalledWith("approve");
  });

  it("shows the arguments the tool would run with", () => {
    render(
      <AssistantApprovalCard
        request={request({ input: { query: "delete every peer" } })}
        onRespond={vi.fn()}
      />,
    );

    expect(screen.getByText(/"query": "delete every peer"/)).toBeTruthy();
  });

  it("ignores keys pressed outside the card", () => {
    const onRespond = vi.fn();
    render(
      <>
        <button type="button">Elsewhere</button>
        <AssistantApprovalCard request={request()} onRespond={onRespond} />
      </>,
    );
    arm();

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(screen.getByText("Elsewhere"), { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("takes focus on itself, where Enter allows and Space answers nothing", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    const card = screen.getByRole("alertdialog");
    expect(document.activeElement).toBe(card);
    fireEvent.keyDown(card, { key: " " });
    expect(onRespond).not.toHaveBeenCalled();
    const pressed = fireEvent.keyDown(card, { key: "Enter" });
    expect(pressed).toBe(false);
    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith("approve");
  });

  it("does not allow on Enter until the card has been on screen for a moment", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    const card = screen.getByRole("alertdialog");

    fireEvent.keyDown(card, { key: "Enter" });
    act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS - 1));
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(1));
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onRespond).toHaveBeenCalledWith("approve");
  });

  it("does not allow on a held Enter", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter", repeat: true });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("does not allow on Enter pressed on the page or in one of its fields", () => {
    const onRespond = vi.fn();
    render(
      <>
        <input aria-label="Peer name" />
        <AssistantApprovalCard request={request()} onRespond={onRespond} />
      </>,
    );
    arm();

    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(screen.getByLabelText("Peer name"), { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("does not allow on Enter while the panel around it is closed", () => {
    const onRespond = vi.fn();
    render(
      <div inert>
        <AssistantApprovalCard request={request()} onRespond={onRespond} />
      </div>,
    );
    arm();

    fireEvent.keyDown(screen.getByRole("alertdialog", { hidden: true }), { key: "Enter" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("leaves Enter on a focused button to that button, so Deny denies", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    const deny = screen.getByText("Deny");
    deny.focus();
    const pressed = fireEvent.keyDown(deny, { key: "Enter" });
    expect(pressed).toBe(true);
    expect(onRespond).not.toHaveBeenCalled();

    fireEvent.click(deny);
    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith("cancel");
  });

  it("allows only once, however many times Enter is pressed", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    const card = screen.getByRole("alertdialog");
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("answers a question's primary option on Enter", () => {
    const onRespond = vi.fn();
    const options = [
      { id: "no", label: "No" },
      { id: "yes", label: "Yes", style: "primary" as const },
    ];
    render(
      <AssistantApprovalCard
        request={request({ kind: "question", toolName: undefined, options })}
        onRespond={onRespond}
      />,
    );
    arm();

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
    expect(onRespond).toHaveBeenCalledWith("yes");
  });

  it("leaves focus in a field being typed in elsewhere", () => {
    render(<input aria-label="Peer name" />);
    const field = screen.getByLabelText("Peer name");
    field.focus();
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);
    expect(document.activeElement).toBe(field);
  });

  it("denies on Escape even when a layer on the page has already claimed the key", () => {
    const onRespond = vi.fn();
    const claim = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener("keydown", claim, { capture: true });
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    document.removeEventListener("keydown", claim, { capture: true });
    expect(onRespond).toHaveBeenCalledWith("cancel");
  });

  describe("with the framework's unstyled options", () => {
    const approve = { id: "approve", label: "Approve" };
    const cancel = { id: "cancel", label: "Cancel" };

    it.each([
      ["approve first", [approve, cancel]],
      ["cancel first", [cancel, approve]],
    ])("allows with approve and denies with cancel, listed %s", (_order, options) => {
      const onRespond = vi.fn();
      render(<AssistantApprovalGate request={request({ options })} onRespond={onRespond} />);
      arm();

      expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Deny", "Allow Once"]);
      fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
      expect(onRespond).toHaveBeenCalledWith("cancel");
    });

    it.each([
      ["approve first", [approve, cancel]],
      ["cancel first", [cancel, approve]],
    ])("sends approve for Allow Once, listed %s", (_order, options) => {
      const onRespond = vi.fn();
      render(<AssistantApprovalCard request={request({ options })} onRespond={onRespond} />);
      arm();

      fireEvent.click(screen.getByText("Allow Once"));
      expect(onRespond).toHaveBeenCalledWith("approve");
    });

    it("never offers a lone cancel as Allow Once, whatever its style", () => {
      render(
        <AssistantApprovalCard
          request={request({ options: [{ ...cancel, style: "primary" }] })}
          onRespond={vi.fn()}
        />,
      );

      expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Cancel"]);
    });

    it("knows the pair whatever the case of its ids, and answers with the id as it was sent", () => {
      const onRespond = vi.fn();
      const options = [
        { id: "Cancel", label: "Cancel" },
        { id: "Approve", label: "Approve" },
      ];
      render(<AssistantApprovalCard request={request({ options })} onRespond={onRespond} />);
      arm();

      expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Deny", "Allow Once"]);
      fireEvent.click(screen.getByText("Allow Once"));
      expect(onRespond).toHaveBeenCalledWith("Approve");
    });
  });

  describe("with options that are not the framework's approve and cancel", () => {
    const sentBy = (options: { id: string; label: string }[]) =>
      options.map((option, index) => {
        const onRespond = vi.fn();
        const { unmount } = render(
          <AssistantApprovalCard request={request({ options })} onRespond={onRespond} />,
        );
        arm();
        const button = screen.getAllByRole("button")[index];
        fireEvent.click(button);
        unmount();
        return [button.textContent, onRespond.mock.calls[0]?.[0]];
      });

    it("keeps each option's own label, so no button says the opposite of what it sends", () => {
      expect(
        sentBy([
          { id: "deny", label: "Deny" },
          { id: "allow", label: "Allow" },
        ]),
      ).toEqual([
        ["Deny", "deny"],
        ["Allow", "allow"],
      ]);
    });

    it("shows a third option as what it is, not as a second Deny", () => {
      expect(
        sentBy([
          { id: "approve", label: "Approve" },
          { id: "approve_always", label: "Always approve" },
          { id: "cancel", label: "Cancel" },
        ]),
      ).toEqual([
        ["Approve", "approve"],
        ["Always approve", "approve_always"],
        ["Cancel", "cancel"],
      ]);
    });

    it("answers nothing on Escape or Enter, having no option known to refuse or to allow", () => {
      const onRespond = vi.fn();
      const options = [
        { id: "deny", label: "Deny" },
        { id: "allow", label: "Allow", style: "primary" as const },
      ];
      render(<AssistantApprovalCard request={request({ options })} onRespond={onRespond} />);
      arm();

      fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
      fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
      expect(onRespond).not.toHaveBeenCalled();
    });

    it("draws no option as the default", () => {
      const options = [
        { id: "deny", label: "Deny", style: "danger" as const },
        { id: "allow", label: "Allow", style: "primary" as const },
      ];
      const { container } = render(
        <AssistantApprovalCard request={request({ options: [options[1]] })} onRespond={vi.fn()} />,
      );
      const lone = container.querySelector("button")?.className;
      cleanup();
      render(<AssistantApprovalCard request={request({ options })} onRespond={vi.fn()} />);

      for (const button of screen.getAllByRole("button")) expect(button.className).toBe(lone);
    });
  });

  describe("to a screen reader", () => {
    const describedBy = () =>
      (screen.getByRole("alertdialog").getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");

    it("does not claim to be modal, which would hide a page that stays usable", () => {
      render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

      expect(screen.getByRole("alertdialog").hasAttribute("aria-modal")).toBe(false);
    });

    it("is described by its explanation and the arguments the tool would run with", () => {
      render(
        <AssistantApprovalCard
          request={request({ input: { query: "delete every peer" } })}
          onRespond={vi.fn()}
        />,
      );

      expect(describedBy()).toContain("The assistant is waiting for you.");
      expect(describedBy()).toContain('"query": "delete every peer"');
      expect(describedBy()).not.toContain("1 of");
    });

    it("says how many requests are waiting, when more than one is", () => {
      render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} queued={3} />);

      expect(describedBy()).toContain("1 of 3");
    });

    it("points at nothing that is not on the card", () => {
      render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

      const ids = screen.getByRole("alertdialog").getAttribute("aria-describedby")?.split(" ") ?? [];
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
    });
  });

  it("says how much of the request is below the fold, until it has been scrolled to", () => {
    const heights = { scrollHeight: 616, clientHeight: 256 };
    for (const [name, value] of Object.entries(heights))
      vi.spyOn(HTMLElement.prototype, name as keyof typeof heights, "get").mockReturnValue(value);
    render(
      <AssistantApprovalCard
        request={request({ input: { note: "x\n".repeat(40), target: "All" } })}
        onRespond={vi.fn()}
      />,
    );

    expect(screen.getByText("Scroll to see 20 more lines")).toBeTruthy();

    const box = screen.getByText(/"target": "All"/);
    box.scrollTop = 360;
    fireEvent.scroll(box);
    expect(screen.queryByText(/Scroll to see/)).toBeNull();
    vi.restoreAllMocks();
  });

  it("shows text-direction controls as escapes, so the request reads in the order it is sent", () => {
    render(
      <AssistantApprovalCard
        request={request({ input: { target: "All\u202Egnp.exe" } })}
        onRespond={vi.fn()}
      />,
    );

    expect(screen.getByText(/"target": "All\\u202Egnp\.exe"/)).toBeTruthy();
  });

  it("shows zero-width characters as escapes, and leaves the arguments themselves alone", () => {
    const input = { group: "Ad\u200Bmins", peer: "\uFEFFrouter\u2060\u200C\u200D" };
    const sent = JSON.stringify(input);
    render(<AssistantApprovalCard request={request({ input })} onRespond={vi.fn()} />);

    expect(screen.getByText(/"group": "Ad\\u200Bmins"/)).toBeTruthy();
    expect(screen.getByText(/"peer": "\\uFEFFrouter\\u2060\\u200C\\u200D"/)).toBeTruthy();
    expect(JSON.stringify(input)).toBe(sent);
  });

  it("counts the lines below the fold again when the box is resized", () => {
    const heights = { scrollHeight: 616, clientHeight: 616 };
    for (const name of Object.keys(heights) as (keyof typeof heights)[])
      vi.spyOn(HTMLElement.prototype, name, "get").mockImplementation(() => heights[name]);
    const { unmount } = render(
      <AssistantApprovalCard
        request={request({ input: { note: "x\n".repeat(40), target: "All" } })}
        onRespond={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Scroll to see/)).toBeNull();
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([screen.getByText(/"target": "All"/)]);

    heights.clientHeight = 256;
    act(() => observers[0].resize());
    expect(screen.getByText("Scroll to see 20 more lines")).toBeTruthy();

    unmount();
    expect(observers[0].disconnected).toBe(true);
    vi.restoreAllMocks();
  });

  it("answers nothing until the card has been on screen for a moment", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onRespond).not.toHaveBeenCalled();

    arm();
    fireEvent.click(screen.getByText("Allow Once"));
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("does not let a double-click answer the request queued behind", () => {
    const onRespond = vi.fn();
    const { rerender } = render(
      <AssistantApprovalGate request={request()} onRespond={onRespond} queued={2} />,
    );
    expect(screen.getByText("1 of 2")).toBeTruthy();
    arm();
    fireEvent.click(screen.getByText("Allow Once"));

    rerender(
      <AssistantApprovalGate
        request={request({ requestId: "req-2" })}
        onRespond={onRespond}
        queued={1}
      />,
    );
    fireEvent.click(screen.getByText("Allow Once"));
    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/1 of/)).toBeNull();
  });

  it("ignores a held key", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    const held = fireEvent.keyDown(screen.getByText("Deny"), { key: "Enter", repeat: true });
    expect(held).toBe(false);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape", repeat: true });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("answers nothing while the panel around it is closed", () => {
    const onRespond = vi.fn();
    render(
      <div inert>
        <AssistantApprovalCard request={request()} onRespond={onRespond} />
      </div>,
    );
    arm();

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.keyDown(screen.getByRole("alertdialog", { hidden: true }), { key: "Escape" });
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("offers Stop for a request that came with nothing to answer it with", () => {
    const onRespond = vi.fn();
    const onStop = vi.fn();
    render(
      <AssistantApprovalCard
        request={request({ kind: "question", toolName: undefined, options: [] })}
        onRespond={onRespond}
        onStop={onStop}
      />,
    );
    arm();

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onRespond).not.toHaveBeenCalled();
  });

  it("puts deny before allow, whatever order the framework listed them in", () => {
    render(<AssistantApprovalCard request={request()} onRespond={vi.fn()} />);

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(["Deny", "Allow Once"]);
  });

  it("denies on Escape pressed inside the card", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    fireEvent.keyDown(screen.getByText("Deny"), { key: "Escape" });
    expect(onRespond).toHaveBeenCalledWith("cancel");
  });

  it("latches after the first answer", () => {
    const onRespond = vi.fn();
    render(<AssistantApprovalCard request={request()} onRespond={onRespond} />);
    arm();

    fireEvent.click(screen.getByText("Allow Once"));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
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

  it("offers New chat beside Stop at the length limit, on the right", () => {
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
    arm();
    fireEvent.click(screen.getByText("New chat"));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onRespond).toHaveBeenCalledWith("stop");
  });

  it("starts a new chat on Enter at the length limit, once armed and never from a button", () => {
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
    const card = screen.getByRole("alertdialog");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onNewChat).not.toHaveBeenCalled();

    arm();
    fireEvent.keyDown(screen.getByText("Stop"), { key: "Enter" });
    fireEvent.keyDown(card, { key: "Enter", repeat: true });
    expect(onNewChat).not.toHaveBeenCalled();

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onRespond).not.toHaveBeenCalled();
  });
});
