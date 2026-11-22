import { act, cleanup, renderHook } from "@testing-library/react";
import type { MessageStreamEvent } from "eve/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatStatus } from "../lib/chat-session";
import { CONTROL_CENTER_TOOLS, runControlCenterTool } from "../lib/control-center";
import { Vault } from "../lib/vault";
import { TURN_SETTLE_MS, useBrowserToolLoop } from "./useBrowserToolLoop";

const executor = vi.fn(async () => ({ ok: true, content: "done" }));
const releaseCanvas = vi.fn();

vi.mock("../lib/canvas", () => ({ beginAgentTurn: () => releaseCanvas }));

vi.mock("../lib/control-center", async (original) => ({
  ...(await original<typeof import("../lib/control-center")>()),
  runControlCenterTool: vi.fn(),
}));

vi.mock("../contexts/AssistantContext", () => ({
  useAssistantContext: () => ({
    navigate: () => {},
    currentPath: () => "/peers",
    extraExecutors: { page_tool: executor },
  }),
}));

const event = (type: string, data: unknown = {}) => ({ type, data }) as unknown as MessageStreamEvent;

const browserCall = (requestId: string, toolName = "page_tool") =>
  event("input.requested", {
    requests: [
      {
        requestId,
        kind: "question",
        prompt: "",
        action: { toolName, callId: requestId, input: { page: "peers" } },
      },
    ],
  });

const approval = (requestId: string) =>
  event("input.requested", {
    requests: [
      {
        requestId,
        kind: "tool-approval",
        prompt: "Approve tool call: delete_peer",
        action: { toolName: "delete_peer", callId: requestId, input: {} },
        options: [{ id: "approve", label: "Approve" }],
      },
    ],
  });

const CANVAS_TOOL = Object.keys(CONTROL_CENTER_TOOLS)[0];

const mount = () => {
  const vault = new Vault();
  const chat = { status: "streaming" as ChatStatus };
  const respond = vi.fn(async () => {
    chat.status = "submitted";
  });
  const hook = renderHook(() =>
    useBrowserToolLoop({
      getSessionId: () => "session-1",
      getStatus: () => chat.status,
      getVault: () => vault,
      respond,
    }),
  );
  return { ...hook, respond, vault, chat };
};

const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

beforeEach(() => {
  vi.useFakeTimers();
  executor.mockClear();
  releaseCanvas.mockClear();
  vi.mocked(runControlCenterTool).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useBrowserToolLoop", () => {
  it("runs a browser call and sends its result", async () => {
    const { result, respond } = mount();

    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledTimes(1);
  });

  it("carries a parked tool call's arguments, with their tokens restored, for the approval card", () => {
    const { result, vault } = mount();
    const token = vault.mint("peer", "office-router");

    act(() =>
      result.current.handleEvent(
        event("input.requested", {
          requests: [
            {
              requestId: "approval-1",
              kind: "tool-approval",
              prompt: "Approve tool call: delete_peer",
              action: { toolName: "delete_peer", callId: "c1", input: { peer: token } },
              options: [{ id: "approve", label: "Approve" }],
            },
          ],
        }),
      ),
    );

    expect(result.current.pendingInput?.input).toEqual({ peer: "office-router" });
  });

  it("holds browser calls while a stop is being confirmed, and runs them if the cancel fails", async () => {
    const { result, respond } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();
    expect(executor).not.toHaveBeenCalled();

    act(() => result.current.abortStop());
    await settle();
    expect(executor).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledTimes(1);
  });

  it("drops the held calls once the stop is confirmed, and those still arriving for the stopped turn", async () => {
    const { result, respond } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(browserCall("call-2")));
    await settle();

    expect(executor).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it("runs browser calls again from the next turn", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-3")));
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("keeps ignoring the stopped turn when it only starts after the stop was confirmed", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();
    expect(executor).not.toHaveBeenCalled();

    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-2")));
    await settle();
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("keeps ignoring the stopped turn when it starts while the stop is being confirmed", async () => {
    const { result, respond } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(browserCall("call-2")));
    await settle();

    expect(executor).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it("runs the calls of a turn started by a message sent after the stop, with no boundary in between", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.finishStop());
    act(() => result.current.messageSent());
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("keeps the calls and cards of a turn that started before the stop was confirmed", async () => {
    const { result, respond } = mount();

    act(() => result.current.handleEvent(approval("old-card")));
    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(browserCall("old-call")));
    await settle();
    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("new-call")));
    act(() => result.current.handleEvent(approval("new-card")));
    await settle();
    act(() => result.current.finishStop());
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledWith([{ requestId: "new-call", text: "" }], expect.anything());
    expect(result.current.pendingInputs.map((r) => r.requestId)).toEqual(["new-card"]);
  });

  it("does not hold the next turn's calls when the stop then fails", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("new-call")));
    await settle();
    expect(executor).toHaveBeenCalledTimes(1);

    act(() => result.current.abortStop());
    act(() => result.current.handleEvent(browserCall("next-call")));
    await settle();
    expect(executor).toHaveBeenCalledTimes(2);
  });

  describe("the canvas turn", () => {
    it("is not released while a canvas call is still running", async () => {
      let finish: (outcome: { ok: boolean; content: string }) => void = () => {};
      vi.mocked(runControlCenterTool).mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { result, respond, chat } = mount();

      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      await settle();
      expect(runControlCenterTool).toHaveBeenCalledTimes(1);
      chat.status = "ready";
      act(() => [event("turn.cancelled"), event("session.waiting")].forEach(result.current.handleEvent));
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 5));
      expect(releaseCanvas).not.toHaveBeenCalled();

      finish({ ok: true, content: "done" });
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(respond).toHaveBeenCalledTimes(1);
      chat.status = "ready";
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 2));
      expect(releaseCanvas).toHaveBeenCalledTimes(1);
    });

    it("is kept between the steps of a turn that parked on its calls, and released when the turn ends", async () => {
      vi.mocked(runControlCenterTool).mockResolvedValue({ ok: true, content: "done" });
      const { result, respond, chat } = mount();

      act(() => result.current.handleEvent(event("turn.started")));
      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      act(() => result.current.handleEvent(event("turn.waiting")));
      await settle();
      expect(respond).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 5));
      chat.status = "streaming";
      act(() => result.current.handleEvent(event("step.started")));
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 5));
      expect(releaseCanvas).not.toHaveBeenCalled();

      act(() => result.current.handleEvent(event("turn.completed")));
      chat.status = "ready";
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS));
      expect(releaseCanvas).toHaveBeenCalledTimes(1);
    });

    it("is kept when a parked turn resumes before the release is due", async () => {
      vi.mocked(runControlCenterTool).mockResolvedValue({ ok: true, content: "done" });
      const { result, chat } = mount();

      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      await settle();
      chat.status = "ready";
      act(() => result.current.handleEvent(event("turn.waiting")));
      act(() => result.current.handleEvent(event("step.started")));
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 5));

      expect(releaseCanvas).not.toHaveBeenCalled();
    });

    it("is kept when the next turn starts right after the calls drain", async () => {
      vi.mocked(runControlCenterTool).mockResolvedValue({ ok: true, content: "done" });
      const { result, chat } = mount();

      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      act(() => [event("turn.completed"), event("session.waiting")].forEach(result.current.handleEvent));
      await settle();
      chat.status = "ready";
      act(() => result.current.handleEvent(event("turn.started")));
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 5));

      expect(releaseCanvas).not.toHaveBeenCalled();
    });

    it("is released when the turn ends over calls that were answered before they could run", async () => {
      vi.mocked(runControlCenterTool).mockResolvedValue({ ok: true, content: "done" });
      const { result, chat } = mount();

      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      await settle();
      act(() => result.current.handleEvent(browserCall("call-2")));
      act(() => result.current.handleEvent(event("input.resolved", { resolutions: [{ requestId: "call-2" }] })));
      act(() => result.current.handleEvent(event("turn.cancelled")));
      chat.status = "ready";
      await act(() => vi.advanceTimersByTimeAsync(TURN_SETTLE_MS * 2));

      expect(executor).not.toHaveBeenCalled();
      expect(releaseCanvas).toHaveBeenCalledTimes(1);
    });

    it("is released at once by a reset, even with a call running", async () => {
      vi.mocked(runControlCenterTool).mockReturnValue(new Promise(() => {}));
      const { result } = mount();

      act(() => result.current.handleEvent(browserCall("canvas-1", CANVAS_TOOL)));
      await settle();
      act(() => result.current.reset());

      expect(releaseCanvas).toHaveBeenCalledTimes(1);
    });
  });

  it("does not hold the next turn's calls when the stopped turn ended before the cancel returned", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(browserCall("call-4")));
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("discards the held calls when the stop fails after the turn had ended on the stream", async () => {
    const { result, respond } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(browserCall("held")));
    await settle();
    act(() => result.current.handleEvent(event("turn.cancelled")));
    act(() => result.current.handleEvent(event("session.waiting")));
    act(() => result.current.abortStop());
    await settle();

    expect(executor).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it("keeps ignoring a stopped turn that parks between its calls", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(browserCall("call-1")));
    act(() => result.current.handleEvent(event("turn.waiting")));
    act(() => result.current.handleEvent(browserCall("call-2")));
    await settle();

    expect(executor).not.toHaveBeenCalled();
  });

  it("does not take a turn that parked while the stop was being confirmed for one that ended", async () => {
    const { result } = mount();

    act(() => result.current.beginStop());
    act(() => result.current.handleEvent(event("turn.waiting")));
    act(() => result.current.finishStop());
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();

    expect(executor).not.toHaveBeenCalled();
  });

  it("lets each of two overlapping stops settle only itself", async () => {
    const { result } = mount();

    const first = result.current.beginStop();
    act(() => result.current.messageSent());
    const second = result.current.beginStop();
    act(() => result.current.finishStop(first));
    act(() => result.current.abortStop(second));
    act(() => result.current.handleEvent(event("turn.started")));
    act(() => result.current.handleEvent(browserCall("call-1")));
    await settle();

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("runs nothing when a stop is confirmed after unmounting", async () => {
    const { result, unmount } = mount();
    const { beginStop, finishStop, handleEvent } = result.current;

    beginStop();
    handleEvent(event("turn.cancelled"));
    unmount();
    finishStop();
    handleEvent(browserCall("call-6"));
    await vi.advanceTimersByTimeAsync(100);

    expect(executor).not.toHaveBeenCalled();
  });

  it("runs nothing for an event that reaches it after unmounting", async () => {
    const { result, unmount } = mount();
    const { handleEvent } = result.current;

    unmount();
    handleEvent(browserCall("call-5"));
    await vi.advanceTimersByTimeAsync(100);

    expect(executor).not.toHaveBeenCalled();
  });
});
