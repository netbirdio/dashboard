import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantProvider } from "../contexts/AssistantContext";
import { SESSION_ID_HEADER, SESSION_PATH } from "../lib/contract";
import { ERROR_MESSAGES } from "../lib/session-client";
import { useAssistant,type UseAssistantResult } from "./useAssistant";

const HOST = "https://assistant.test";
const SESSION = `${HOST}${SESSION_PATH}/s1`;

const approval = {
  type: "input.requested",
  data: {
    turnId: "turn-1",
    stepIndex: 0,
    requests: [
      {
        requestId: "approval-1",
        kind: "tool-approval",
        prompt: "Approve tool call: delete_peer",
        action: { kind: "tool-call", toolName: "delete_peer", callId: "c1", input: { peer: "office-router" } },
        options: [
          { id: "approve", label: "Approve", style: "primary" },
          { id: "cancel", label: "Cancel", style: "danger" },
        ],
      },
    ],
  },
};

function serve({ cancelStatus }: { cancelStatus: number }) {
  let push: (event: unknown) => void = () => {};
  const encoder = new TextEncoder();
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url === `${HOST}${SESSION_PATH}`) return Response.json({ sessionId: "s1" });
    if (url.startsWith(`${SESSION}/stream`)) {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          push = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        },
      });
      return new Response(body, { headers: { [SESSION_ID_HEADER]: "s1" } });
    }
    if (url === `${SESSION}/cancel`) return Response.json({}, { status: cancelStatus });
    return Response.json({});
  });
  return { fetch, push: (event: unknown) => push(event) };
}

const pageTool = vi.fn(async () => ({ ok: true, content: "done" }));

function mount() {
  const engine: { current: UseAssistantResult | null } = { current: null };
  function Probe() {
    engine.current = useAssistant();
    return null;
  }
  render(
    <AssistantProvider
      host={HOST}
      headers={async () => ({})}
      navigate={() => {}}
      currentPath={() => "/peers"}
      currentUserId="user-1"
      conversationId="conversation-1"
      extraExecutors={{ page_tool: pageTool }}
    >
      <Probe />
    </AssistantProvider>,
  );
  return () => engine.current as UseAssistantResult;
}

async function parkOnApproval(server: ReturnType<typeof serve>) {
  const engine = mount();
  act(() => engine().runtime.thread.append("Remove the office router"));
  await waitFor(() => expect(engine().sessionId).toBe("s1"));
  await waitFor(() =>
    expect(server.fetch.mock.calls.some(([url]) => String(url).startsWith(`${SESSION}/stream`))).toBe(true),
  );
  server.push(approval);
  await waitFor(() => expect(engine().pendingInput?.requestId).toBe("approval-1"));
  return engine;
}

beforeEach(() => {
  globalThis.sessionStorage.clear();
  pageTool.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAssistant", () => {
  it("stores nothing in the tab that no later mount could read back", async () => {
    const engine = await parkOnApproval(serve({ cancelStatus: 200 }));

    expect(engine().sessionId).toBe("s1");
    expect(globalThis.sessionStorage.length).toBe(0);
  });

  it("keeps what the turn was waiting on when Stop does not reach the agent", async () => {
    const engine = await parkOnApproval(serve({ cancelStatus: 500 }));

    act(() => engine().runtime.thread.cancelRun());
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(engine().pendingInput?.requestId).toBe("approval-1");
  });

  it("says so when Stop does not reach the agent", async () => {
    const engine = await parkOnApproval(serve({ cancelStatus: 500 }));
    expect(engine().error).toBeNull();

    act(() => engine().runtime.thread.cancelRun());

    await waitFor(() => expect(engine().error).toBe(ERROR_MESSAGES.temporarilyUnavailable));
  });

  it("discards what the turn was waiting on once Stop is confirmed", async () => {
    const engine = await parkOnApproval(serve({ cancelStatus: 200 }));

    act(() => engine().runtime.thread.cancelRun());

    await waitFor(() => expect(engine().pendingInput).toBeNull());
  });

  it("no longer reports a Stop that did not reach the agent once the turn has ended", async () => {
    const server = serve({ cancelStatus: 500 });
    const engine = await parkOnApproval(server);
    act(() => engine().runtime.thread.cancelRun());
    await waitFor(() => expect(engine().error).toBe(ERROR_MESSAGES.temporarilyUnavailable));

    server.push({ type: "turn.completed", data: { turnId: "turn-1" } });

    await waitFor(() => expect(engine().error).toBeNull());
  });

  it("runs the browser calls of a turn started by answering a card after a Stop", async () => {
    const server = serve({ cancelStatus: 200 });
    const engine = await parkOnApproval(server);
    act(() => engine().runtime.thread.cancelRun());
    await waitFor(() => expect(engine().pendingInput).toBeNull());
    const later = structuredClone(approval);
    later.data.requests[0].requestId = "approval-2";
    server.push(later);
    await waitFor(() => expect(engine().pendingInput?.requestId).toBe("approval-2"));

    await act(() => engine().respondToInput("approve"));
    server.push({ type: "turn.started", data: { turnId: "turn-2" } });
    server.push({
      type: "input.requested",
      data: {
        turnId: "turn-2",
        requests: [
          {
            requestId: "call-1",
            kind: "question",
            prompt: "",
            action: { kind: "tool-call", toolName: "page_tool", callId: "c2", input: {} },
          },
        ],
      },
    });

    await waitFor(() => expect(pageTool).toHaveBeenCalledTimes(1));
  });
});
