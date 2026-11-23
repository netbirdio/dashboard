"use client";

import type { InputResponse, MessageStreamEvent } from "eve/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAssistantContext } from "../contexts/AssistantContext";
import { beginAgentTurn } from "../lib/canvas";
import type { ChatStatus } from "../lib/chat-session";
import type { BrowserResults, ToolOutcome } from "../lib/contract";
import {
  BROWSER_RESULT_MAX_CHARS,
  BROWSER_RESULTS_MAX_PER_REQUEST,
  BROWSER_TOOLS,
  CHAT_REQUEST_MAX_BYTES,
  READ_TOOLS,
} from "../lib/contract";
import { CONTROL_CENTER_HREF, CONTROL_CENTER_TOOLS, runControlCenterTool } from "../lib/control-center";
import { ownEntry } from "../lib/own";
import {
  readAuditEvents,
  readNetbirdApi,
  searchAccount,
} from "../lib/reads";
import { describeAssistantError, ERROR_MESSAGES } from "../lib/session-client";
import type { BrowserToolContext } from "../lib/tools";
import { redactResult, restoreToolInput, type Vault } from "../lib/vault";

// Browser calls run one at a time, in the order the model made them:
// a control_center_add run concurrently with the draft before it would find nothing to add to.
// Inputs have their tokens restored and results are tokenised before sending, so the agent only handles tokens.

interface BrowserCall {
  requestId: string;
  toolName: string;
  input: unknown;
  order: number;
}

type BrowserResult = BrowserResults["browserResults"][number];

interface BrowserToolQueueDeps {
  execute: (call: BrowserCall) => Promise<ToolOutcome>;
  deliver: (responses: InputResponse[], results: BrowserResult[]) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onDeliveryFailed?: (err: unknown) => void;
}

const RESULTS_BUDGET_BYTES = CHAT_REQUEST_MAX_BYTES - 16 * 1024;
const TOO_LARGE = "[The result was too large to send. Narrow the read with a filter instead of repeating it.]";
const DELIVERY_ATTEMPTS = 3;

const utf8 = new TextEncoder();
const wireBytes = (content: string) => utf8.encode(JSON.stringify(content)).length;

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
};

type Ran = { call: BrowserCall; outcome: ToolOutcome };

// An oversized result is replaced by a note, never cut: the agent could not re-profile cut JSON.
function requests(entries: Ran[]): Ran[][] {
  const out: Ran[][] = [];
  let current: Ran[] = [];
  let left = RESULTS_BUDGET_BYTES;
  for (const entry of entries) {
    const { content } = entry.outcome;
    const fits = content.length <= BROWSER_RESULT_MAX_CHARS && wireBytes(content) <= RESULTS_BUDGET_BYTES;
    const sent = fits ? entry : { call: entry.call, outcome: { ok: false, content: TOO_LARGE } };
    const size = wireBytes(sent.outcome.content);
    if (current.length >= BROWSER_RESULTS_MAX_PER_REQUEST || size > left) {
      out.push(current);
      current = [];
      left = RESULTS_BUDGET_BYTES;
    }
    current.push(sent);
    left -= size;
  }
  if (current.length > 0) out.push(current);
  return out;
}

const RELEASED = Symbol("released");

class BrowserToolQueue {
  private chain: Promise<void> = Promise.resolve();
  private readonly seen = new Set<string>();
  private readonly settled = new Set<string>();
  private readonly releases = new Map<string, () => void>();
  private pending = 0;
  private disposed = false;
  private paused: Promise<void> | null = null;
  private unpause: (() => void) | null = null;

  constructor(private readonly deps: BrowserToolQueueDeps) {}

  get busy(): boolean {
    return this.pending > 0;
  }

  markSettled(requestId: string): void {
    this.settled.add(requestId);
    this.releases.get(requestId)?.();
  }

  pause(): void {
    if (this.paused || this.disposed) return;
    this.paused = new Promise((resolve) => {
      this.unpause = resolve;
    });
  }

  resume(): void {
    this.unpause?.();
    this.paused = null;
    this.unpause = null;
  }

  dispose(): void {
    if (this.disposed) return;
    for (const release of this.releases.values()) release();
    // Before `disposed` is set, and not when the abandoned work resolves:
    // every generation of the queue drives the same busy flag.
    this.setPending(0);
    this.disposed = true;
    this.resume();
  }

  enqueue(calls: BrowserCall[]): void {
    const fresh = calls.filter((c) => !this.seen.has(c.requestId) && !this.settled.has(c.requestId));
    if (this.disposed || fresh.length === 0) return;
    for (const call of fresh) this.seen.add(call.requestId);
    this.setPending(this.pending + 1);
    this.chain = this.chain
      .then(() => this.run(fresh))
      // A rejected link would skip every later `.then` and wedge the queue.
      .catch(() => {})
      .finally(() => this.setPending(this.pending - 1));
  }

  private async run(calls: BrowserCall[]): Promise<void> {
    const ran: Ran[] = [];
    for (const call of calls) {
      if (this.paused) await this.paused;
      if (this.disposed) return;
      if (this.settled.has(call.requestId)) continue;
      const outcome = await this.executed(call);
      if (outcome !== RELEASED) ran.push({ call, outcome });
    }
    if (this.paused) await this.paused;
    for (const batch of requests(ran)) await this.send(batch);
  }

  // Answers are matched by request id, so a retry is safe.
  // On a 413 the batch goes once more with every result withheld, so the turn can still move on.
  private async send(batch: Ran[]): Promise<void> {
    let entries = batch;
    for (let attempt = 1; ; attempt++) {
      const open = entries.filter(({ call }) => !this.settled.has(call.requestId));
      if (this.disposed || open.length === 0) return;
      try {
        // The answer is a placeholder: the agent fills it with the screened result.
        await this.deps.deliver(
          open.map(({ call }) => ({ requestId: call.requestId, text: "" })),
          open.map(({ call, outcome }) => ({ requestId: call.requestId, toolName: call.toolName, ...outcome })),
        );
        return;
      } catch (err) {
        if (this.disposed) return;
        const status = statusOf(err);
        if (status === 413 && entries.some(({ outcome }) => outcome.content !== TOO_LARGE)) {
          entries = entries.map(({ call }) => ({ call, outcome: { ok: false, content: TOO_LARGE } }));
          continue;
        }
        const transient = status === undefined || status === 409 || status === 429 || status >= 500;
        if (!transient || attempt >= DELIVERY_ATTEMPTS) {
          this.deps.onDeliveryFailed?.(err);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
      }
    }
  }

  private async executed(call: BrowserCall): Promise<ToolOutcome | typeof RELEASED> {
    const released = new Promise<typeof RELEASED>((resolve) => {
      this.releases.set(call.requestId, () => resolve(RELEASED));
    });
    try {
      return await Promise.race([
        this.deps.execute(call).catch((err) => ({ ok: false, content: describeAssistantError(err) })),
        released,
      ]);
    } finally {
      this.releases.delete(call.requestId);
    }
  }

  private setPending(next: number): void {
    if (this.disposed) return;
    const wasBusy = this.pending > 0;
    this.pending = next;
    if (wasBusy !== this.pending > 0) this.deps.onBusyChange?.(this.pending > 0);
  }
}

export const TURN_SETTLE_MS = 200;

// Calls are held this long so a step's calls can be put back in the model's order:
// their questions arrive moments apart, and not always in the order the calls were made.
const CALL_ORDER_WINDOW_MS = 40;

const byOrder = (a: BrowserCall, b: BrowserCall) => a.order - b.order;

export interface PendingInputRequest {
  requestId: string;
  kind: string;
  prompt: string;
  toolName?: string;
  input?: unknown;
  /** Not inferable from `options`, since a malformed request also has none. */
  display?: "confirmation" | "select" | "text";
  allowFreeform?: boolean;
  options: {
    id: string;
    label: string;
    description?: string;
    style?: "default" | "primary" | "danger";
  }[];
}

export const acceptsFreeText = (request: PendingInputRequest): boolean =>
  request.kind === "question" &&
  (request.display === "text" || request.allowFreeform === true);

const noExecutor = (name: string) => `Tool "${name}" has no browser executor in this dashboard version.`;
const CANNOT_READ: ToolOutcome = { ok: false, content: "This dashboard cannot read the account for the assistant." };

const asObject = (input: unknown): Record<string, unknown> =>
  input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

interface BrowserToolLoopApi {
  handleEvent: (ev: MessageStreamEvent) => void;
  flushReplayed: () => void;
  busy: boolean;
  deliveryError: unknown;
  pendingInput: PendingInputRequest | null;
  pendingInputs: PendingInputRequest[];
  clearPendingInput: (requestId: string) => void;
  restorePendingInput: (request: PendingInputRequest) => void;
  reset: () => void;
  beginStop: () => number;
  finishStop: (stop?: number) => void;
  abortStop: (stop?: number) => void;
  messageSent: () => void;
}

interface UseBrowserToolLoopOptions {
  getSessionId: () => string | undefined;
  getStatus: () => ChatStatus;
  getVault: () => Vault;
  respond: (responses: InputResponse[], results: BrowserResults) => Promise<void>;
  onRead?: (result: { toolName: string; ok: boolean; content: string }) => void;
}

export function useBrowserToolLoop({
  getSessionId,
  getStatus,
  getVault,
  respond,
  onRead,
}: UseBrowserToolLoopOptions): BrowserToolLoopApi {
  const ctx = useAssistantContext();
  const [busy, setBusy] = useState(false);
  const [deliveryError, setDeliveryError] = useState<unknown>(null);
  // A list: eve can hold several requests at once, and keeping only the newest would leave the session parked.
  const [pendingInputs, setPendingInputs] = useState<PendingInputRequest[]>([]);

  const optsRef = useRef({ getSessionId, getStatus, getVault, respond, onRead });
  optsRef.current = { getSessionId, getStatus, getVault, respond, onRead };

  const replayedRef = useRef(new Map<string, BrowserCall>());
  const callOrderRef = useRef(new Map<string, number>());
  const stagedRef = useRef<BrowserCall[]>([]);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canvasReleaseRef = useRef<(() => void) | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseDueRef = useRef(false);

  const stopRef = useRef<"idle" | "stopping" | "stopped">("idle");
  const stopTokenRef = useRef(0);
  const boundaryWhileStoppingRef = useRef(false);
  const sentSinceStopRef = useRef(false);

  const queueRef = useRef<BrowserToolQueue | null>(null);

  const cancelScheduledRelease = useCallback(() => {
    releaseDueRef.current = false;
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const releaseCanvas = useCallback(() => {
    cancelScheduledRelease();
    canvasReleaseRef.current?.();
    canvasReleaseRef.current = null;
  }, [cancelScheduledRelease]);

  const scheduleCanvasRelease = useCallback(() => {
    if (settleTimerRef.current !== null) return;
    if (stagedRef.current.length > 0 || queueRef.current?.busy) {
      releaseDueRef.current = true;
      return;
    }
    if (!canvasReleaseRef.current) return;
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      if (stagedRef.current.length > 0 || queueRef.current?.busy) {
        releaseDueRef.current = true;
        return;
      }
      const status = optsRef.current.getStatus();
      if (status !== "submitted" && status !== "streaming") releaseCanvas();
    }, TURN_SETTLE_MS);
  }, [releaseCanvas]);

  const onBusyChange = useCallback(
    (next: boolean) => {
      setBusy(next);
      if (!next && releaseDueRef.current) {
        releaseDueRef.current = false;
        scheduleCanvasRelease();
      }
    },
    [scheduleCanvasRelease],
  );

  const isBrowserTool = useCallback(
    (name: string | undefined) => !!name && (BROWSER_TOOLS.includes(name) || Object.hasOwn(ctx.extraExecutors, name)),
    [ctx.extraExecutors],
  );

  const run = useCallback(
    async (toolName: string, input: unknown): Promise<ToolOutcome> => {
      const toolCtx: BrowserToolContext = {
        navigate: ctx.navigate,
        onControlCenterPage: () => ctx.currentPath() === CONTROL_CENTER_HREF,
        currentUserId: ctx.currentUserId,
        // Read through the ref, since a stale id would address another session.
        sessionId: optsRef.current.getSessionId(),
      };
      try {
        const cc = ownEntry(CONTROL_CENTER_TOOLS, toolName);
        if (cc) {
          canvasReleaseRef.current ??= beginAgentTurn();
          return await runControlCenterTool(cc.action, input, toolCtx);
        }
        if (READ_TOOLS.includes(toolName)) {
          const fetch = ctx.fetchManagement;
          if (!fetch) return CANNOT_READ;
          if (toolName === "netbird_api") return await readNetbirdApi(asObject(input), fetch);
          if (toolName === "audit_events") return await readAuditEvents(asObject(input), fetch);
          return await searchAccount(asObject(input), fetch);
        }
        const extra = ownEntry(ctx.extraExecutors, toolName);
        if (extra) return await extra(input, toolCtx);
        return { ok: false, content: noExecutor(toolName) };
      } catch (err) {
        return { ok: false, content: describeAssistantError(err) };
      }
    },
    [ctx],
  );

  const execute = useCallback(
    async (call: BrowserCall): Promise<ToolOutcome> => {
      const vault = optsRef.current.getVault();
      const outcome = await run(call.toolName, restoreToolInput(vault, call.toolName, call.input));
      const tokenised: ToolOutcome = {
        ok: outcome.ok,
        content: redactResult(vault, call.toolName, outcome.content),
      };
      if (READ_TOOLS.includes(call.toolName)) {
        optsRef.current.onRead?.({ toolName: call.toolName, ok: tokenised.ok, content: tokenised.content });
      }
      return tokenised;
    },
    [run],
  );

  const executeRef = useRef(execute);
  executeRef.current = execute;

  const makeQueue = useCallback(
    () =>
      new BrowserToolQueue({
        execute: (call) => executeRef.current(call),
        deliver: (responses, browserResults) => optsRef.current.respond(responses, { browserResults }),
        onBusyChange,
        onDeliveryFailed: (err) => setDeliveryError(err ?? new Error("delivery failed")),
      }),
    [onBusyChange],
  );
  queueRef.current ??= makeQueue();

  const releaseStaged = useCallback(() => {
    stageTimerRef.current = null;
    const calls = [...stagedRef.current].sort(byOrder);
    stagedRef.current = [];
    queueRef.current?.enqueue(calls);
    if (releaseDueRef.current && !queueRef.current?.busy) {
      releaseDueRef.current = false;
      scheduleCanvasRelease();
    }
  }, [scheduleCanvasRelease]);

  const stage = useCallback(
    (calls: BrowserCall[]) => {
      stagedRef.current.push(...calls);
      stageTimerRef.current ??= setTimeout(releaseStaged, CALL_ORDER_WINDOW_MS);
    },
    [releaseStaged],
  );

  const clearStaged = useCallback(() => {
    if (stageTimerRef.current !== null) clearTimeout(stageTimerRef.current);
    stageTimerRef.current = null;
    stagedRef.current = [];
  }, []);

  const reset = useCallback(() => {
    releaseCanvas();
    clearStaged();
    replayedRef.current.clear();
    callOrderRef.current.clear();
    queueRef.current?.dispose();
    queueRef.current = makeQueue();
    stopRef.current = "idle";
    boundaryWhileStoppingRef.current = false;
    setBusy(false);
    setDeliveryError(null);
    setPendingInputs([]);
  }, [releaseCanvas, clearStaged, makeQueue]);

  const handleEvent = useCallback(
    (ev: MessageStreamEvent) => {
      const queue = queueRef.current;
      if (!queue) return;
      switch (ev.type) {
        case "actions.requested": {
          const order = callOrderRef.current;
          for (const action of ev.data.actions ?? []) {
            if (!order.has(action.callId)) order.set(action.callId, order.size);
          }
          return;
        }
        // The only event that tells a parked session apart from an idle one;
        // the `turn.completed` and `session.waiting` that follow look the same.
        case "input.requested": {
          const requests = ev.data.requests ?? [];
          const calls: BrowserCall[] = [];
          const shown: PendingInputRequest[] = [];
          for (const r of requests) {
            if ((r.kind === "question" || r.kind === "tool-approval") && isBrowserTool(r.action?.toolName)) {
              calls.push({
                requestId: r.requestId,
                toolName: r.action.toolName,
                input: r.action.input,
                order: callOrderRef.current.get(r.action.callId) ?? Number.MAX_SAFE_INTEGER,
              });
            } else if (r.kind === "session-limit") {
              // The agent refuses every answer but `stop`: a fresh budget is not the user's to grant.
              shown.push({
                requestId: r.requestId,
                kind: r.kind,
                prompt: ERROR_MESSAGES.chatTooLong,
                display: r.display,
                options: (r.options ?? []).filter((o) => o.id === "stop"),
              });
            } else {
              const vault = optsRef.current.getVault();
              const { restoreText } = vault;
              shown.push({
                requestId: r.requestId,
                kind: r.kind,
                prompt: restoreText(r.prompt),
                toolName: r.action?.toolName,
                ...(r.action ? { input: restoreToolInput(vault, r.action.toolName, r.action.input) } : {}),
                display: r.display,
                allowFreeform: r.allowFreeform,
                options: (r.options ?? []).map((o) => ({
                  ...o,
                  label: restoreText(o.label),
                  ...(o.description === undefined ? {} : { description: restoreText(o.description) }),
                })),
              });
            }
          }
          if (stopRef.current === "stopped") {
            calls.length = 0;
          }
          // Replayed history: wait until it has all arrived, since a later event may show the call resolved.
          if (optsRef.current.getStatus() === "resuming") {
            for (const call of calls) replayedRef.current.set(call.requestId, call);
          } else if (calls.length > 0) {
            stage(calls);
          }
          if (shown.length > 0) {
            setPendingInputs((prev) => {
              const known = new Set(prev.map((r) => r.requestId));
              const added = shown.filter((r) => !known.has(r.requestId));
              return added.length === 0 ? prev : [...prev, ...added];
            });
          }
          return;
        }
        case "input.resolved": {
          const resolutions = ev.data.resolutions;
          // Without ids, dropping every request beats showing one eve would refuse to accept.
          if (!Array.isArray(resolutions)) {
            replayedRef.current.clear();
            setPendingInputs([]);
            return;
          }
          const resolved = new Set(resolutions.map((r) => r.requestId));
          for (const id of resolved) {
            queue.markSettled(id);
            replayedRef.current.delete(id);
          }
          setPendingInputs((prev) => prev.filter((r) => !resolved.has(r.requestId)));
          return;
        }
        case "turn.started":
          if (stopRef.current !== "idle" && (boundaryWhileStoppingRef.current || sentSinceStopRef.current)) {
            if (stopRef.current === "stopping") reset();
            stopRef.current = "idle";
          }
          cancelScheduledRelease();
          setDeliveryError(null);
          return;
        case "step.started":
          cancelScheduledRelease();
          return;
        case "turn.waiting":
          scheduleCanvasRelease();
          return;
        case "turn.completed":
        case "turn.cancelled":
        case "turn.failed":
        case "session.waiting":
        case "session.failed":
        case "session.completed":
          if (stopRef.current === "stopping") boundaryWhileStoppingRef.current = true;
          else stopRef.current = "idle";
          scheduleCanvasRelease();
          return;
        default:
          return;
      }
    },
    [cancelScheduledRelease, scheduleCanvasRelease, isBrowserTool, stage, reset],
  );

  const flushReplayed = useCallback(() => {
    const calls = [...replayedRef.current.values()].sort(byOrder);
    replayedRef.current.clear();
    queueRef.current?.enqueue(calls);
  }, []);

  const clearPendingInput = useCallback(
    (requestId: string) => setPendingInputs((prev) => prev.filter((r) => r.requestId !== requestId)),
    [],
  );

  const restorePendingInput = useCallback(
    (request: PendingInputRequest) =>
      setPendingInputs((prev) => (prev.some((r) => r.requestId === request.requestId) ? prev : [request, ...prev])),
    [],
  );

  const beginStop = useCallback(() => {
    stopRef.current = "stopping";
    boundaryWhileStoppingRef.current = false;
    sentSinceStopRef.current = false;
    queueRef.current?.pause();
    return ++stopTokenRef.current;
  }, []);

  const settlesStop = useCallback(
    (stop: number | undefined) =>
      stopRef.current === "stopping" && (stop ?? stopTokenRef.current) === stopTokenRef.current && !!queueRef.current,
    [],
  );

  const finishStop = useCallback(
    (stop?: number) => {
      if (!settlesStop(stop)) return;
      const ended = boundaryWhileStoppingRef.current;
      reset();
      stopRef.current = ended ? "idle" : "stopped";
    },
    [reset, settlesStop],
  );

  const abortStop = useCallback(
    (stop?: number) => {
      if (!settlesStop(stop)) return;
      if (boundaryWhileStoppingRef.current) {
        reset();
        return;
      }
      stopRef.current = "idle";
      queueRef.current?.resume();
    },
    [reset, settlesStop],
  );

  const messageSent = useCallback(() => {
    sentSinceStopRef.current = true;
  }, []);

  useEffect(() => {
    queueRef.current ??= makeQueue();
    return () => {
      releaseCanvas();
      clearStaged();
      queueRef.current?.dispose();
      queueRef.current = null;
    };
  }, [releaseCanvas, clearStaged, makeQueue]);

  return {
    handleEvent,
    flushReplayed,
    busy,
    deliveryError,
    pendingInput: pendingInputs[0] ?? null,
    pendingInputs,
    clearPendingInput,
    restorePendingInput,
    reset,
    beginStop,
    finishStop,
    abortStop,
    messageSent,
  };
}
