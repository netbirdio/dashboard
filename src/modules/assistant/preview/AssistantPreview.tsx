/**
 * A test screen for everything the chat can put on screen.
 *
 * The point is to see the *real* components: this mounts the actual
 * `AssistantThread` against a local runtime whose transcript is imported rather
 * than fetched, so what renders here is what a live conversation renders. No
 * assistant server is involved and no tool ever runs.
 *
 * Two halves to it. The imported transcript (`previewTranscript.tsx`) covers
 * everything that survives a finished turn — messages, the activity trail, the
 * full Markdown range, inline components, an errored answer, an interrupted
 * one. The runs behind the toolbar cover what only exists *during* a turn: the
 * working indicator, a tool call in flight, text streaming in, and the stop
 * button. The transcript ends on a held tool call so those are visible at rest
 * rather than for the second they last live.
 *
 * Deliberately not covered: the question card. It's driven by the panel, not the
 * thread, and it has its own states.
 */
"use client";

import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type ChatModelRunResult,
  ExportedMessageRepository,
  type ThreadAssistantMessagePart,
  type ToolCallMessagePart,
  useLocalRuntime,
} from "@assistant-ui/react";
import { cn } from "@utils/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import { PANEL_WIDTH } from "../AssistantPanelContext";
import { AssistantThread } from "../components/AssistantThread";
import { RedactorProvider } from "../privacy/RedactorContext";
import { COMPONENT_PART } from "../runtime/useAssistantRuntime";
import { createPreviewSession, PREVIEW_MESSAGES } from "./previewTranscript";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const REASONING = `The question is about reachability, so the peer list is the
place to start; if one is offline I should say why rather than just that it is.`;

const STREAMED_ANSWER = `Two of your three peers are online. **{PEER_2}** hasn't
checked in since 9 August, and its login has expired — reconnect it with
\`netbird up\` on that host, or extend the expiry for its group.`;

/**
 * What the next run should do. `hold` parks on the in-flight state — a tool
 * running, with the working indicator under it — and stays there until the run
 * is stopped, since that's on screen for about a second in real life and that
 * isn't long enough to judge it.
 */
type RunMode = "script" | "hold";

/** Parked until the turn is stopped (the composer's ■, or another button). */
const untilStopped = (abortSignal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (abortSignal.aborted) return resolve();
    abortSignal.addEventListener("abort", () => resolve(), { once: true });
  });

const runningToolPart = (): ThreadAssistantMessagePart => ({
  type: "tool-call",
  toolCallId: "preview-tool",
  toolName: "list_peers",
  args: {} as ToolCallMessagePart["args"],
  argsText: "{}",
});

/**
 * The scripted turn, played whatever the user types. Mirrors the real runtime's
 * sequence — status line, tool part, streamed text, inline component — closely
 * enough that timing and layout shifts show up here the way they would live.
 */
function usePreviewAdapter(
  onStatus: (status: string | null) => void,
  mode: React.RefObject<RunMode>,
): ChatModelAdapter {
  return useMemo(
    () => ({
      async *run({ abortSignal }): AsyncGenerator<ChatModelRunResult, void> {
        const parts: ThreadAssistantMessagePart[] = [];
        const snapshot = () => ({ content: [...parts] });
        const stopped = () => abortSignal.aborted;

        try {
          onStatus("Thinking");

          if (mode.current === "hold") {
            parts.push({
              type: "reasoning",
              text: "Two of the three were online a minute ago; checking whether that still holds.",
            });
            parts.push(runningToolPart());
            yield snapshot();
            await untilStopped(abortSignal);
            return;
          }

          for (const word of REASONING.split(" ")) {
            if (stopped()) return;
            const last = parts[parts.length - 1];
            parts[parts.length - 1 + (last?.type === "reasoning" ? 0 : 1)] =
              last?.type === "reasoning"
                ? { type: "reasoning", text: `${last.text} ${word}` }
                : { type: "reasoning", text: word };
            yield snapshot();
            await sleep(25);
          }
          await sleep(400);
          if (stopped()) return;

          parts.push(runningToolPart());
          yield snapshot();
          await sleep(1400);
          if (stopped()) return;

          parts[0] = {
            ...(parts[0] as ToolCallMessagePart),
            result: "3 peers",
          };
          yield snapshot();
          await sleep(700);
          if (stopped()) return;

          onStatus(null);
          parts.push({ type: "text", text: "" });
          for (const word of STREAMED_ANSWER.split(" ")) {
            if (stopped()) return;
            const last = parts[parts.length - 1] as {
              type: "text";
              text: string;
            };
            parts[parts.length - 1] = {
              type: "text",
              text: last.text ? `${last.text} ${word}` : word,
            };
            yield snapshot();
            await sleep(40);
          }

          const component = {
            component: "canvas_preview",
            title: "Extend login expiry for {GROUP_1}",
            resource: "group",
            data: { group: "{GROUP_1}", login_expiration_enabled: false },
          };
          parts.push({
            type: "tool-call",
            toolCallId: "preview-component",
            toolName: COMPONENT_PART,
            args: component as ToolCallMessagePart["args"],
            argsText: JSON.stringify(component),
            result: component,
          });

          yield { ...snapshot(), status: { type: "complete", reason: "stop" } };
        } finally {
          onStatus(null);
        }
      },
    }),
    [onStatus, mode],
  );
}

function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border border-nb-gray-850 bg-nb-gray-900 px-3 py-1.5 text-xs text-nb-gray-300",
        "transition-colors hover:border-nb-gray-800 hover:bg-nb-gray-850 hover:text-nb-gray-100",
      )}
    >
      {children}
    </button>
  );
}

export function AssistantPreview() {
  const [status, setStatus] = useState<string | null>(null);
  // One session for the life of the screen: the transcript's placeholders are
  // minted by this redactor, so replacing it would render raw `{PEER_1}`.
  const session = useMemo(() => createPreviewSession(), []);
  // Read at the start of each run rather than passed in: the adapter is built
  // once, and the buttons decide what the *next* run should be.
  const modeRef = useRef<RunMode>("script");
  const runtime = useLocalRuntime(usePreviewAdapter(setStatus, modeRef));

  /**
   * Load the finished transcript, then hang the in-flight state off the end of
   * it — the one thing a transcript can't carry, since a saved message is by
   * definition no longer running.
   */
  const load = () => {
    runtime.thread.cancelRun();
    runtime.thread.import(
      ExportedMessageRepository.fromArray(PREVIEW_MESSAGES),
    );
    modeRef.current = "hold";
    const messages = runtime.thread.getState().messages;
    runtime.thread.startRun({
      parentId: messages[messages.length - 1]?.id ?? null,
    });
  };

  const replayTurn = () => {
    modeRef.current = "script";
    runtime.thread.append("Which peers are offline?");
  };

  const importedRef = useRef(false);
  useEffect(() => {
    if (importedRef.current) return;
    importedRef.current = true;
    load();
    // Mount only: `load` restarts the run, so depending on it would reload the
    // thread on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton onClick={load}>Full transcript</ToolbarButton>
        <ToolbarButton onClick={replayTurn}>Replay a turn</ToolbarButton>
        <ToolbarButton
          onClick={() => {
            runtime.thread.cancelRun();
            runtime.thread.import({ messages: [] });
          }}
        >
          Empty state
        </ToolbarButton>
        <span className="text-xs text-nb-gray-500">
          The turn at the end is held open — stop it (■) to end it.
        </span>
      </div>

      {/* The panel's own surface and width, so spacing and wrapping match what
          the assistant actually looks like rather than the page it sits on. */}
      <div
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-nb-gray-800 bg-nb-gray-925"
        style={{ width: PANEL_WIDTH, height: "calc(100vh - 260px)" }}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          <RedactorProvider value={session}>
            <AssistantThread
              question={null}
              onDismissQuestion={() => {}}
              context={null}
              onDismissContext={() => {}}
              status={status}
            />
          </RedactorProvider>
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

export default AssistantPreview;
