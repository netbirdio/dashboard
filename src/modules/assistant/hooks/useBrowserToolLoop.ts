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

/*
  A browser tool parks the turn on a question naming the call and its input.
  The dashboard runs it, then answers every call of that pause at once:
  a placeholder answer per call, with what each reported as a browser result
  the agent screens and writes into the answer, which the call returns.
  Calls run in the order the model made them,
  since a control_center_add run concurrently with the draft before it would find nothing to add to.
  Each call runs with the tokens in its input restored, and its result is tokenised before it is sent,
  so the agent only ever handles tokens.
*/

interface BrowserCall {
  requestId: string;
  toolName: string;
  input: unknown;
  /** Where the call stood among the step's calls; unknown calls go last. */
  order: number;
}

type BrowserResult = BrowserResults["browserResults"][number];

interface BrowserToolQueueDeps {
  execute: (call: BrowserCall) => Promise<ToolOutcome>;
  deliver: (responses: InputResponse[], results: BrowserResult[]) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  /** The answers could not be delivered, so the turn stays parked until the chat is reloaded. */
  onDeliveryFailed?: (err: unknown) => void;
}

// The results of one request, in UTF-8 bytes as sent; the rest of the cap is
// the envelope and each answer's ids, generously.
const RESULTS_BUDGET_BYTES = CHAT_REQUEST_MAX_BYTES - 16 * 1024;
// Says what to do next, since a model told only that it failed repeats the same read.
const TOO_LARGE = "[The result was too large to send. Narrow the read with a filter instead of repeating it.]";
const DELIVERY_ATTEMPTS = 3;

const utf8 = new TextEncoder();
/** A result's size in the request body: escaped as a JSON string, then encoded. */
const wireBytes = (content: string) => utf8.encode(JSON.stringify(content)).length;

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
};

type Ran = { call: BrowserCall; outcome: ToolOutcome };

/**
 * The results split into requests the agent takes: each within the request cap and the count cap,
 * in order. A result too large for any request goes as a short note instead.
 * Never cut: a cut JSON result could not be re-profiled, and the agent would withhold it anyway.
 */
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

  constructor(private readonly deps: BrowserToolQueueDeps) {}

  /** eve resolved this request (another tab answered it, or the turn ended), so it is not run or answered. */
  markSettled(requestId: string): void {
    this.settled.add(requestId);
    this.releases.get(requestId)?.();
  }

  /** Abandons the queue: its work belongs to a conversation the user has left. */
  dispose(): void {
    if (this.disposed) return;
    for (const release of this.releases.values()) release();
    // Settled here, not when the abandoned work resolves:
    // every generation of the queue drives the same busy flag.
    this.setPending(0);
    this.disposed = true;
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
      if (this.disposed) return;
      if (this.settled.has(call.requestId)) continue;
      const outcome = await this.executed(call);
      if (outcome !== RELEASED) ran.push({ call, outcome });
    }
    for (const batch of requests(ran)) await this.send(batch);
  }

  /**
   * Answers the calls, retrying a failure that may pass. The answers are matched
   * by request id, so a repeat is safe. A request too large for the agent goes
   * once more with every result withheld, which still lets the turn move on.
   */
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

  // A rejecting executor still owes the model an answer, so it becomes a failed outcome.
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

// How long a turn boundary has to stand before the canvas lock is released:
// long enough to bridge a queued follow-up turn, short enough that the scrim does not linger.
export const TURN_SETTLE_MS = 200;

/*
  How long calls are held before they run, so the step's calls can be put back
  in the model's order. Each browser call is its own workflow, and the
  workflows of one step start together and ask separately, so their questions
  arrive moments apart and not always in the order the calls were made.
*/
const CALL_ORDER_WINDOW_MS = 40;

const byOrder = (a: BrowserCall, b: BrowserCall) => a.order - b.order;

/**
 * An input request eve paused the session on that the host renders:
 * an `ask_question`, a runtime-limit continuation or an approval for a non-browser tool.
 * Later messages queue behind it until it is resolved.
 */
export interface PendingInputRequest {
  /** Identifies the request, not a tool call. */
  requestId: string;
  /** eve's discriminator: `session-limit`, `tool-approval` or `question`. */
  kind: string;
  prompt: string;
  toolName?: string;
  /**
   * The answer shape eve expects:
   * `text` for a question without options, `select` with options, `confirmation` for an approval.
   * Not inferable from `options`, since a malformed request also has none.
   */
  display?: "confirmation" | "select" | "text";
  /** The model offered options but will also accept typed text. */
  allowFreeform?: boolean;
  options: {
    id: string;
    label: string;
    description?: string;
    style?: "default" | "primary" | "danger";
  }[];
}

/** Whether the request can be answered by typing; only a `question` ever can. */
export const acceptsFreeText = (request: PendingInputRequest): boolean =>
  request.kind === "question" &&
  (request.display === "text" || request.allowFreeform === true);

const noExecutor = (name: string) => `Tool "${name}" has no browser executor in this dashboard version.`;
const CANNOT_READ: ToolOutcome = { ok: false, content: "This dashboard cannot read the account for the assistant." };

const asObject = (input: unknown): Record<string, unknown> =>
  input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

interface BrowserToolLoopApi {
  handleEvent: (ev: MessageStreamEvent) => void;
  /** Runs the browser calls a resumed session is still parked on, once its history has replayed. */
  flushReplayed: () => void;
  busy: boolean;
  /** Why the browser's answers last failed to reach the agent; cleared when a turn starts. */
  deliveryError: unknown;
  pendingInput: PendingInputRequest | null;
  pendingInputs: PendingInputRequest[];
  clearPendingInput: (requestId: string) => void;
  /** Puts back a request whose answer did not go through, at the head where it was. */
  restorePendingInput: (request: PendingInputRequest) => void;
  reset: () => void;
}

interface UseBrowserToolLoopOptions {
  getSessionId: () => string | undefined;
  getStatus: () => ChatStatus;
  /** The chat's vault, read per call since a new chat replaces it. */
  getVault: () => Vault;
  respond: (responses: InputResponse[], results: BrowserResults) => Promise<void>;
  /** An account read, tokenised, for the engine to carry into the next message. */
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
  // eve can hold several outstanding requests at once,
  // and keeping only the newest would leave the session parked forever.
  const [pendingInputs, setPendingInputs] = useState<PendingInputRequest[]>([]);

  const optsRef = useRef({ getSessionId, getStatus, getVault, respond, onRead });
  optsRef.current = { getSessionId, getStatus, getVault, respond, onRead };

  // Browser calls seen while history replays, in order; resolved ones drop out.
  const replayedRef = useRef(new Map<string, BrowserCall>());
  // Each call's place among the calls the model has made, from eve's own announcement of them.
  const callOrderRef = useRef(new Map<string, number>());
  // Calls held for the order window, and the timer that releases them.
  const stagedRef = useRef<BrowserCall[]>([]);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Holds the canvas still from the first cc_* tool of a turn until the turn
  // settles, spanning the model round-trips between tool batches.
  const canvasReleaseRef = useRef<(() => void) | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledRelease = useCallback(() => {
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
    if (!canvasReleaseRef.current || settleTimerRef.current !== null) return;
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      releaseCanvas();
    }, TURN_SETTLE_MS);
  }, [releaseCanvas]);

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
          cancelScheduledRelease();
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
    [ctx, cancelScheduledRelease],
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

  // The queue outlives renders, so it reaches the latest executor through a ref.
  const executeRef = useRef(execute);
  executeRef.current = execute;

  const queueRef = useRef<BrowserToolQueue | null>(null);
  const makeQueue = useCallback(
    () =>
      new BrowserToolQueue({
        execute: (call) => executeRef.current(call),
        deliver: (responses, browserResults) => optsRef.current.respond(responses, { browserResults }),
        onBusyChange: setBusy,
        onDeliveryFailed: (err) => setDeliveryError(err ?? new Error("delivery failed")),
      }),
    [],
  );
  queueRef.current ??= makeQueue();

  const releaseStaged = useCallback(() => {
    stageTimerRef.current = null;
    const calls = [...stagedRef.current].sort(byOrder);
    stagedRef.current = [];
    queueRef.current?.enqueue(calls);
  }, []);

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
              // The model asks in tokens; the person reads names.
              const { restoreText } = optsRef.current.getVault();
              shown.push({
                requestId: r.requestId,
                kind: r.kind,
                prompt: restoreText(r.prompt),
                toolName: r.action?.toolName,
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
          cancelScheduledRelease();
          setDeliveryError(null);
          return;
        case "turn.completed":
        // A question parks the turn open; the canvas is the user's while they answer.
        case "turn.waiting":
        case "turn.cancelled":
        case "turn.failed":
        case "session.waiting":
        case "session.failed":
        case "session.completed":
          scheduleCanvasRelease();
          return;
        default:
          return;
      }
    },
    [cancelScheduledRelease, scheduleCanvasRelease, isBrowserTool, stage],
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

  const reset = useCallback(() => {
    releaseCanvas();
    clearStaged();
    replayedRef.current.clear();
    callOrderRef.current.clear();
    queueRef.current?.dispose();
    queueRef.current = makeQueue();
    setBusy(false);
    setDeliveryError(null);
    setPendingInputs([]);
  }, [releaseCanvas, clearStaged, makeQueue]);

  // Unmounting must not leave the canvas scrim up, nor a held call run.
  useEffect(() => () => {
    releaseCanvas();
    clearStaged();
  }, [releaseCanvas, clearStaged]);

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
  };
}
