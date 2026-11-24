import { AssistantRuntimeProvider, type ThreadMessageLike, useExternalStoreRuntime } from "@assistant-ui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingInputRequest } from "@/modules/assistant/hooks/useBrowserToolLoop";
import { ERROR_MESSAGES } from "@/modules/assistant/lib/session-client";
import { AssistantThread, composerPlaceholder, NO_SUCH_OPTION, typedAnswer } from "./AssistantThread";
import { ARMING_DELAY_MS } from "./useArmingDelay";

const engine = {
  statusLine: null,
  turnActive: false,
  pendingInput: null as PendingInputRequest | null,
  pendingInputs: [] as PendingInputRequest[],
  respondToInput: vi.fn(async (_answer: string | { text: string }) => {}),
  error: null,
};

vi.mock("@/modules/assistant/hooks/useAssistant", () => ({
  useAssistant: () => engine,
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useLoggedInUser: () => ({}),
}));
vi.mock("@/modules/assistant/chat/AssistantContextChip", () => ({
  AssistantContextChip: () => null,
}));

const choice = (overrides: Partial<PendingInputRequest> = {}): PendingInputRequest => ({
  requestId: "question-1",
  kind: "question",
  prompt: "Which range?",
  display: "select",
  options: [
    { id: "a", label: "10.0.0.0/8" },
    { id: "b", label: "192.168.0.0/16" },
  ],
  ...overrides,
});

const approval = (overrides: Partial<PendingInputRequest> = {}): PendingInputRequest => ({
  requestId: "approval-1",
  kind: "tool-approval",
  prompt: "Approve tool call: netbird_api",
  toolName: "netbird_api",
  options: [
    { id: "approve", label: "Approve" },
    { id: "cancel", label: "Cancel" },
  ],
  ...overrides,
});

const onNew = vi.fn(async () => {});
const onCancel = vi.fn(async () => {});

function Thread({ running = false }: Readonly<{ running?: boolean }>) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: [],
    convertMessage: (message) => message,
    isRunning: running,
    onNew,
    onCancel,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread context={null} onDismissContext={() => {}} />
    </AssistantRuntimeProvider>
  );
}

const pend = (request: PendingInputRequest | null) => {
  engine.pendingInput = request;
  engine.pendingInputs = request ? [request] : [];
};

const ask = (request: PendingInputRequest) => {
  pend(request);
  render(<Thread />);
  return screen.getByRole("textbox") as HTMLTextAreaElement;
};

const type = (input: HTMLTextAreaElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  engine.respondToInput.mockReset().mockResolvedValue(undefined);
  engine.turnActive = false;
  pend(null);
  onNew.mockClear();
  onCancel.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("typedAnswer", () => {
  it("sends the text as written when the question takes free text", () => {
    expect(typedAnswer(choice({ allowFreeform: true }), "neither")).toEqual({ text: "neither" });
  });

  it("answers with the option the text names", () => {
    expect(typedAnswer(choice(), " 192.168.0.0/16 ")).toBe("b");
  });

  it("answers nothing when the text names no option and free text is not taken", () => {
    expect(typedAnswer(choice(), "neither, use 10.0.0.0/24")).toBeNull();
  });
});

describe("composerPlaceholder", () => {
  const question = { id: "q", title: "Which range?", options: [], multi: false };

  it("invites a typed answer only when the question takes one", () => {
    expect(composerPlaceholder(question, false, true)).toContain("type your answer");
    expect(composerPlaceholder(question, false, false)).not.toContain("type your answer");
  });

  it("offers picking by number only where a number cannot be the answer itself", () => {
    const named = { ...question, options: [{ label: "Office" }, { label: "Datacenter" }] };
    const numeric = { ...question, options: [{ label: "7" }, { label: "30 days" }] };

    expect(composerPlaceholder(named, false, true)).toBe("Pick an option, type its number, or type your answer");
    expect(composerPlaceholder(numeric, false, true)).toBe("Pick an option, or type your answer");
    expect(composerPlaceholder(numeric, false, false)).toContain("type its number");
  });
});

describe("AssistantThread", () => {
  it("keeps a typed answer that matches no option, and says why it was not sent", () => {
    const input = ask(choice());
    expect(input.placeholder).not.toContain("type your answer");

    type(input, "neither, use 10.0.0.0/24");

    expect(engine.respondToInput).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
    expect(input.value).toBe("neither, use 10.0.0.0/24");
    expect(screen.getByRole("alert").textContent).toBe(NO_SUCH_OPTION);
  });

  it("clears the composer once a typed answer is sent", () => {
    const input = ask(choice({ allowFreeform: true }));

    type(input, "neither, use 10.0.0.0/24");

    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "neither, use 10.0.0.0/24" });
    expect(input.value).toBe("");
  });

  it("puts a typed answer back and reports it when it does not reach the agent", async () => {
    engine.respondToInput.mockRejectedValue(new TypeError("Failed to fetch"));
    const input = ask(choice({ allowFreeform: true }));

    type(input, "neither, use 10.0.0.0/24");

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(ERROR_MESSAGES.unreachable));
    expect(input.value).toBe("neither, use 10.0.0.0/24");
  });

  it("puts the answer to an open question back when it does not reach the agent", async () => {
    engine.respondToInput.mockRejectedValue(new TypeError("Failed to fetch"));
    const input = ask(choice({ display: "text", options: [] }));

    type(input, "10.0.0.0/24");

    await waitFor(() => expect(input.value).toBe("10.0.0.0/24"));
    expect(screen.getByRole("alert").textContent).toBe(ERROR_MESSAGES.unreachable);
  });

  const days = (overrides: Partial<PendingInputRequest> = {}) =>
    choice({
      prompt: "How many days should the setup key be valid?",
      options: [
        { id: "week", label: "7" },
        { id: "month", label: "30" },
        { id: "quarter", label: "90" },
      ],
      ...overrides,
    });

  it("sends a typed number as written when the options are numbers themselves", () => {
    const input = ask(days({ allowFreeform: true }));

    type(input, "1");

    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "1" });
  });

  const groups = [
    { id: "a", label: "All" },
    { id: "b", label: "Admins" },
  ];

  it("takes a typed number as a pick when free text is taken and no option starts with a digit", () => {
    const input = ask(choice({ allowFreeform: true, options: groups }));

    type(input, "2");

    expect(engine.respondToInput).toHaveBeenCalledWith("b");
  });

  it.each([
    ["a duration", ["2h", "4h", "8h", "24h"]],
    ["a port", ["80/tcp", "443/tcp", "8080/tcp"]],
    ["a share", ["100%", "50%", "25%"]],
    ["a range", ["5-10 peers", "10-50 peers"]],
    ["an ordinal", ["3rd party", "2FA"]],
  ])("sends a typed number as written when an option starts with a number, as %s does", (_kind, labels) => {
    const options = labels.map((label, index) => ({ id: `option-${index}`, label }));
    const input = ask(choice({ allowFreeform: true, options }));

    type(input, "2");

    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "2" });
  });

  it("takes a typed number as a pick when the question takes no free text", () => {
    const input = ask(days());

    type(input, "1");

    expect(engine.respondToInput).toHaveBeenCalledWith("week");
  });

  it("does not hand focus to a button when an approval takes the composer's place", () => {
    engine.turnActive = true;
    const { rerender } = render(<Thread running />);
    screen.getByRole("textbox").focus();

    pend(approval());
    rerender(<Thread running />);

    expect(document.activeElement).toBe(screen.getByRole("alertdialog"));
  });

  it("focuses the composer again once an approval is answered from inside the panel", () => {
    vi.useFakeTimers();
    engine.turnActive = true;
    pend(approval());
    const { rerender } = render(<Thread running />);
    act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS));
    fireEvent.click(screen.getByText("Allow Once"));

    pend(null);
    rerender(<Thread running />);

    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("leaves focus where it is on the page when the composer comes back", () => {
    engine.turnActive = true;
    pend(approval());
    const { rerender } = render(
      <>
        <input aria-label="Peer name" />
        <Thread running />
      </>,
    );
    const field = screen.getByLabelText("Peer name");
    field.focus();

    pend(null);
    rerender(
      <>
        <input aria-label="Peer name" />
        <Thread running />
      </>,
    );

    expect(document.querySelector("textarea")).not.toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it("does not let a double-click on Allow Once stop the turn it just allowed", () => {
    vi.useFakeTimers();
    engine.turnActive = true;
    pend(approval());
    const { rerender } = render(<Thread running />);

    pend(null);
    rerender(<Thread running />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onCancel).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not let a double-click on Allow Once send a draft as the answer to the next question", () => {
    vi.useFakeTimers();
    engine.turnActive = true;
    pend(approval());
    const { rerender } = render(<Thread running />);

    pend(choice({ allowFreeform: true }));
    rerender(<Thread running />);
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "a follow-up" } });
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    expect(engine.respondToInput).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "a follow-up" });
  });

  it("does not let a click aimed at Stop send a draft as the answer to a question that just arrived", () => {
    vi.useFakeTimers();
    engine.turnActive = true;
    const { rerender } = render(<Thread running />);
    act(() => void vi.advanceTimersByTime(10 * ARMING_DELAY_MS));
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "also check the DNS settings" } });

    pend(choice({ allowFreeform: true }));
    rerender(<Thread />);
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    expect(engine.respondToInput).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(ARMING_DELAY_MS));
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "also check the DNS settings" });
  });

  it("holds the same click when the question that arrived is an open one", () => {
    vi.useFakeTimers();
    engine.turnActive = true;
    const { rerender } = render(<Thread running />);
    act(() => void vi.advanceTimersByTime(10 * ARMING_DELAY_MS));
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "also check the DNS settings" } });

    pend(choice({ allowFreeform: true, options: [] }));
    rerender(<Thread />);
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    expect(engine.respondToInput).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(engine.respondToInput).toHaveBeenCalledWith({ text: "also check the DNS settings" });
  });
});
