// The chat thread: message list, composer and question card, built on assistant-ui primitives.
"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { ArrowDown, ArrowUp, Cable, Check, ChevronRight, Copy, History, PenLine, RotateCw, ShieldCheck, Square } from "lucide-react";
import Image from "next/image";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NetBirdLogoMark from "@/assets/netbird.svg";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import type { PageContextEntry } from "@/interfaces/Assistant";
import { CHAT_PAD } from "@/interfaces/Assistant";
import { acceptsFreeText, useAssistant } from "@/modules/assistant";
import {
  AssistantApprovalGate,
  AssistantOpenQuestionCard,
  isOpenQuestion,
} from "@/modules/assistant/chat/AssistantApprovalCard";
import { AssistantContextChip } from "@/modules/assistant/chat/AssistantContextChip";
import { AssistantErrorNotice } from "@/modules/assistant/chat/AssistantErrorNotice";
import { AssistantInlineComponent } from "@/modules/assistant/chat/AssistantInlineComponent";
import { AssistantMarkdownText } from "@/modules/assistant/chat/AssistantMarkdownText";
import {
  type AssistantQuestion,
  AssistantQuestionCard,
  parseOptionNumbers,
} from "@/modules/assistant/chat/AssistantQuestionCard";
import { AssistantToolActivity } from "@/modules/assistant/chat/AssistantToolActivity";
import { TurnActiveContext } from "@/modules/assistant/chat/AssistantTurnContext";

// Width of the `.nb-scrollbar` track, so overlays can stop short of it.
const SCROLLBAR_WIDTH = 10;

// How far the context chip reaches above the composer, in px. The chip is out
// of the flow, so anything just above the composer has to be told about it.
const CONTEXT_LIFT = 50;

// The current status, published to the running message so the indicator can
// sit under the step it belongs to.
const StatusContext = createContext<string | null>(null);

// A card, not a row. `ask_question` is eve's built-in: the framework parks the
// turn on it and never writes its result back into the message, so as a row it
// would spin long after the user answered.
const isQuestionTool = (name?: string) => name === "ask_question";

// Reasoning and tool calls go in the steps panel; components and the question
// card are output, so they stay in the answer where the model put them.
// Reasoning and step-start markers are grouped but never rendered — hiding
// them here rather than leaving them ungrouped keeps the tool calls around
// them coalesced into one panel instead of one panel per stream step.
const groupSteps = (part: { type: string; toolName?: string }) => {
  if (part.type === "reasoning" || part.type === "step-start")
    return ["group-steps"] as const;
  return part.type === "tool-call" &&
    part.toolName !== "render_component" &&
    !isQuestionTool(part.toolName)
    ? (["group-steps"] as const)
    : null;
};

// Below this a summary hides more than it saves.
const SUMMARIZE_FROM = 3;

function UserText({ text }: Readonly<{ text: string }>) {
  return <span className="whitespace-pre-wrap">{text}</span>;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-5 flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-br-sm bg-nb-gray-900 px-3 py-2 text-sm text-nb-gray-100">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

const actionClass =
  "flex h-7 w-7 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-nb-gray-100 disabled:pointer-events-none disabled:opacity-30";

// Not `ActionBarPrimitive.Copy`: `useCopyToClipboard` fires the dashboard's
// standard notification.
function CopyAction() {
  const text = useAuiState((s) =>
    s.message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim(),
  );
  // Only while THIS message still streams — copying then would grab a
  // fragment. Finished messages stay copyable through later turns.
  const running = useAuiState(
    (s) =>
      s.message.role === "assistant" && s.message.status.type === "running",
  );
  const [, copyToClipboard, copied] = useCopyToClipboard(text);

  // Absent rather than disabled while the answer is still streaming: a
  // greyed-out button offers an action that cannot mean anything yet. The
  // placeholder holds the bar's height so the row does not jump when the
  // stream ends — the bar itself only exists once there is text (see the gate
  // on MessageActions), so this never pads a message that has none.
  if (!text || running) {
    return <div className="h-7 w-7" aria-hidden />;
  }

  return (
    <button
      type="button"
      aria-label="Copy answer"
      title="Copy"
      onClick={() => copyToClipboard("The answer has been copied.")}
      className={actionClass}
    >
      {copied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

// Always mounted: the bar's height is part of the message's layout, and
// mounting it late (the old `hideWhenRunning`) shifted the thread at every
// turn boundary and made finished messages uncopyable mid-turn. It stays
// invisible until hover; only its buttons know about running state.
function MessageActions() {
  return (
    <ActionBarPrimitive.Root className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
      <CopyAction />
    </ActionBarPrimitive.Root>
  );
}

// Steps show live while the turn runs — they're the only progress there is —
// then collapse to a single line. Reasoning parts sit in the group unrendered
// (the status line stands in for them), so only tool calls count as steps.
function StepsPanel({
  running,
  indices,
  children,
}: Readonly<{
  running: boolean;
  indices: readonly number[];
  children: React.ReactNode;
}>) {
  const turnActive = useContext(TurnActiveContext);
  const [open, setOpen] = useState(false);

  // Once a panel has run in this turn it stays expanded until the turn is
  // over: its own `running` ends at every round boundary, and collapsing
  // there just to open the next round's panel reads as flicker. Panels of
  // finished turns never see `running`, so a new turn leaves them collapsed.
  // Adjusted during render (with guards) rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [live, setLive] = useState(running);
  if (running && !live) setLive(true);
  if (!running && !turnActive && live) setLive(false);

  const count = useAuiState(
    (s) =>
      indices.filter((i) => s.message.parts[i]?.type === "tool-call").length,
  );

  if (count === 0) return null;
  if (running || (live && turnActive) || count < SUMMARIZE_FROM) {
    return <div className="my-2">{children}</div>;
  }

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="flex items-center gap-1.5 rounded-md py-1 text-chat text-nb-gray-300 transition-colors hover:text-nb-gray-100"
      >
        <ChevronRight
          size={13}
          className={cn("shrink-0 transition-transform", open && "rotate-90")}
        />
        {open ? "Hide steps" : `Show ${count} steps`}
      </button>
      {open && <div className="pl-1">{children}</div>}
    </div>
  );
}

function AssistantMessage() {
  const status = useContext(StatusContext);

  /*
    The bottom margin separates answers from each other. A message that is only
    tool calls is not an answer — it is the work leading to the one below it,
    and the runtime splits a single turn across several such messages. Spacing
    those like finished replies opens a gap between the last step and the
    working line that reads as the assistant having stopped.
  */
  const hasText = useAuiState((s) =>
    s.message.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    ),
  );

  return (
    <MessagePrimitive.Root
      className={cn("group/message mt-1.5", hasText ? "mb-6" : "mb-1")}
    >
      <div className="max-w-full">
        {/* The `indicator` slot puts the working line under the step that's
          running. `always`, not `no-text`: reasoning renders as nothing here,
          and `no-text` would suppress the indicator exactly while the model
          thinks. The indicator hides itself once the answer streams — the
          runtime nulls the status when the last part is text. */}
        <MessagePrimitive.GroupedParts groupBy={groupSteps} indicator="always">
          {({ part, children }) => {
            switch (part.type) {
              case "group-steps":
                return (
                  <StepsPanel
                    running={part.status?.type === "running"}
                    indices={part.indices}
                  >
                    {children}
                  </StepsPanel>
                );
              case "text":
                return <AssistantMarkdownText />;
              case "reasoning":
                return null;
              case "tool-call": {
                if (isQuestionTool(part.toolName)) return null;
                return part.toolName === "render_component" ? (
                  <AssistantInlineComponent {...part} />
                ) : (
                  <AssistantToolActivity {...part} />
                );
              }
              case "indicator":
                return <WorkingIndicator status={status} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        {/* What went wrong is already in the message text (see
          `describeAssistantError`); this only adds a way to act on it. */}
        <MessagePrimitive.Error>
          <ActionBarPrimitive.Reload className="mt-4 flex items-center gap-1.5 rounded-md border border-nb-gray-800 px-2 py-1 text-xs text-nb-gray-300 transition-colors hover:border-nb-gray-700 hover:text-nb-gray-100 disabled:opacity-40">
            <RotateCw size={12} />
            Try again
          </ActionBarPrimitive.Reload>
        </MessagePrimitive.Error>

        {/* Only where there is an answer to copy. Gated on `parts.length` this
            mounted under a message that is still all tool calls, reserving a
            row of height for a button that could never do anything — which is
            the gap that used to sit between the last step and the working
            line. */}
        <AuiIf
          condition={(s) =>
            s.message.parts.some(
              (part) => part.type === "text" && part.text.trim().length > 0,
            )
          }
        >
          <MessageActions />
        </AuiIf>
      </div>
    </MessagePrimitive.Root>
  );
}

// `status` goes null once text starts streaming; from there the answer itself
// is the progress indicator. The 16px box matches AssistantToolActivity's, so
// both lines start text on one column.
function WorkingIndicator({ status }: Readonly<{ status: string | null }>) {
  // The status line is one string shared by the whole thread, but the
  // indicator slot belongs to a message — so a turn that leaves an earlier
  // assistant message unfinished (a tool that never returned, a turn resumed
  // after an approval) renders "Thinking…" once per such message, stacked with
  // a message-sized gap between them. There is only ever one thing the
  // assistant is currently doing, so only the last message may say so.
  const claimsStatus = useAuiState(
    (s) =>
      s.message.role === "assistant" &&
      s.message.isLast &&
      s.message.status.type === "running",
  );
  /*
    A gap above the line, but only when an answer sits above it.

    A markdown block ends flush — `last:mb-0` on its paragraphs — because the
    copy bar is what normally separates an answer from whatever comes next. That
    bar mounts once per message, after every part, so a working line that lands
    between the text and the bar has the sentence directly on top of it and all
    of the bar's height underneath: the space is there, just on the wrong side.
    After a tool step the tightness is the point (see the `mb` gate on Root),
    and a message with no text to separate from keeps it.
  */
  const followsText = useAuiState((s) =>
    s.message.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    ),
  );
  if (!status || !claimsStatus) return null;

  return (
    <div className={cn("flex items-center gap-2 py-1", followsText && "mt-3")}>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <Image
          src={NetBirdLogoMark}
          alt=""
          width={14}
          height={14}
          className="animate-pulse"
        />
      </span>
      <span
        aria-live="polite"
        className="animate-shimmer bg-gradient-to-r from-nb-gray-500 via-nb-gray-100 to-nb-gray-500 bg-[length:200%_100%] bg-clip-text text-chat text-transparent"
      >
        {status}…
      </span>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Tasks, not questions, and each one says what the assistant should ask for
// or read first, so a click lands in a piece of work rather than a generic
// offer. The prompts are mirrored by the agent's evals/routing/starters.eval.ts;
// change both together.
const STARTERS: {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "Draft Network Changes",
    prompt:
      "Help me give a team access to a server. Ask me which server, its address or name, who needs to reach it and on which ports, then draft the groups, the network and the policy on the canvas for me to review and deploy.",
    icon: <PenLine size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "Review Access Policies",
    prompt:
      "Review my access control. Read my policies and groups, show me who can reach what, and point out anything too broad, like a policy from All to All or one that allows every port.",
    icon: <ShieldCheck size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "Troubleshoot Connectivity",
    prompt:
      "One of my peers can't reach something it should. Ask me which peer and what it is trying to reach, then check whether both are online, which groups they are in and which policy should connect them.",
    icon: <Cable size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "What Changed Recently",
    prompt:
      "What changed in my account in the last 7 days? Read the audit log and tell me who changed what, newest first, with anything that widened access called out.",
    icon: <History size={13} className="shrink-0 text-nb-gray-200" />,
  },
];

// Overlaid on the message area, not inside it: centring on the scroll content
// would miss the middle of the space the user actually sees.
function EmptyState({ bottomOffset }: Readonly<{ bottomOffset: number }>) {
  const aui = useAui();
  const { loggedInUser } = useLoggedInUser();
  const firstName = loggedInUser?.name?.trim().split(/\s+/)[0];

  // Sends outright: a starter is a whole question already.
  const start = (prompt: string) => aui.thread.append(prompt);

  return (
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div
        className="absolute inset-x-0 top-0 z-10 flex flex-col items-center justify-center gap-5 overflow-y-auto py-6 text-center"
        style={{
          bottom: bottomOffset,
          paddingLeft: CHAT_PAD.x,
          paddingRight: CHAT_PAD.x,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <Image src={NetBirdLogoMark} alt="" width={22} height={22} />
            {/* An `h1` for the styling, not the outline — the page beside the
                panel has its own heading. */}
            <h1 aria-hidden="true" className="text-xl">
              {firstName
                ? `${timeOfDayGreeting()}, ${firstName}!`
                : `${timeOfDayGreeting()}!`}
            </h1>
          </div>
          <Paragraph className="justify-center">
            Get started with some examples
          </Paragraph>
        </div>

        {/* The cap keeps the pills from stringing out into one line in the
            full-width overlay. */}
        <div className="flex max-w-[30rem] flex-wrap justify-center gap-2.5">
          {STARTERS.map((starter) => (
            <button
              key={starter.prompt}
              type="button"
              onClick={() => start(starter.prompt)}
              title={starter.prompt}
              className="inline-flex items-center gap-1.5 rounded-full border border-nb-gray-850 bg-nb-gray-900 px-3 py-1.5 text-xs text-nb-gray-300 transition-colors hover:border-nb-gray-800 hover:bg-nb-gray-850 hover:text-nb-gray-100"
            >
              {starter.icon}
              {starter.label}
            </button>
          ))}
        </div>
      </div>
    </AuiIf>
  );
}

function ThreadQuestion({
  question,
  onAnswer,
  onDismiss,
}: Readonly<{
  question: AssistantQuestion | null;
  onAnswer: (indices: number[]) => void;
  onDismiss: () => void;
}>) {
  if (!question) return null;

  // Shown even while the thread runs: the card answers a turn that is
  // parked on the question.
  return (
    <AssistantQuestionCard
      // Resets the multi-select picks when a new question arrives.
      key={question.id}
      question={question}
      onAnswer={onAnswer}
      onDismiss={onDismiss}
    />
  );
}

function composerPlaceholder(
  question: AssistantQuestion | null,
  openQuestion: boolean,
): string {
  if (openQuestion) return "Type your answer";
  if (!question) return "How can I help you today?";
  return question.multi
    ? "Tick what applies, or type your answer"
    : "Pick an option, or type your answer";
}

function Composer({
  question,
  openQuestion,
  onAnswer,
  onAnswerText,
  onAnswerOpen,
}: Readonly<{
  question: AssistantQuestion | null;
  /** A framework pause asked with no options — answered by typing, here. */
  openQuestion: boolean;
  onAnswer: (indices: number[]) => void;
  onAnswerText: (text: string) => void;
  onAnswerOpen: (text: string) => void;
}>) {
  const aui = useAui();

  // "1" / "1,3" picks those options; anything else answers a pending question
  // card as written (its turn is still running, so the normal send path is
  // closed). Returns false when the text wasn't consumed.
  const submitAnswer = (): boolean => {
    const composer = aui.thread.composer();
    const text = composer.getState().text;
    // An open question has no options, so there is no number to parse: whatever
    // was typed IS the answer, and it goes back to the parked framework pause
    // rather than down the normal send path.
    if (openQuestion) {
      if (!text.trim()) return false;
      composer.setText("");
      onAnswerOpen(text.trim());
      return true;
    }
    if (!question) return false;
    const indices = parseOptionNumbers(
      text,
      question.options.length,
      question.multi,
    );
    if (indices) {
      composer.setText("");
      onAnswer(indices);
      return true;
    }
    if (text.trim()) {
      composer.setText("");
      onAnswerText(text.trim());
      return true;
    }
    return false;
  };

  // Captured on the way down to beat the textarea's own Enter handler, which
  // would submit the literal text.
  const answerByKeyboard = (event: React.KeyboardEvent) => {
    if (!question && !openQuestion) return;
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;

    if (submitAnswer()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <ComposerPrimitive.Root
      onKeyDownCapture={answerByKeyboard}
      className={cn(
        "flex flex-col gap-1 rounded-2xl border pl-3 pr-2 py-2",
        // z-10 beats the context chip: its transform/opacity would paint it
        // above plain siblings whatever the DOM order says.
        "relative z-10",
        "border-nb-gray-700 bg-nb-gray-900",
        "ring-offset-nb-gray-950/50 focus-within:ring-2 focus-within:ring-neutral-500/20 focus-within:ring-offset-2",
      )}
    >
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder={composerPlaceholder(question, openQuestion)}
        className="max-h-32 min-h-[38px] w-full resize-none bg-transparent px-0.5 py-1.5 text-sm text-nb-gray-100 outline-none placeholder:text-neutral-400/70"
      />

      <div className="flex items-center justify-end gap-2">
        {/* While a question card is up the thread counts as running, which
            would leave only Stop; this button routes the text to the answer. */}
        {(question || openQuestion) && (
          <button
            type="button"
            aria-label="Send answer"
            onClick={submitAnswer}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              "bg-netbird-500 text-white hover:bg-netbird-500/90",
            )}
          >
            <ArrowUp size={16} />
          </button>
        )}

        {!question && !openQuestion && (
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send
              aria-label="Send"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                "bg-netbird-500 text-white hover:bg-netbird-500/90",
                "disabled:bg-nb-gray-900 disabled:text-nb-gray-500",
              )}
            >
              <ArrowUp size={16} />
            </ComposerPrimitive.Send>
          </AuiIf>
        )}

        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel
            aria-label="Stop"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-nb-gray-700 text-red-500 hover:text-red-400"
          >
            {/* Even size: the bordered 8x8 box has a 30px content area, and an
                odd-sized icon centers on a half pixel — visibly off-middle. */}
            <Square size={12} className="fill-current" />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </ComposerPrimitive.Root>
  );
}

export interface AssistantThreadProps {
  context: PageContextEntry | null;
  onDismissContext: () => void;
  className?: string;
}

export function AssistantThread({
  context,
  onDismissContext,
  className,
}: Readonly<AssistantThreadProps>) {
  const {
    statusLine: status,
    turnActive,
    pendingInput,
    respondToInput,
    error,
  } = useAssistant();

  // An ask_question with options is the tappable card; without, the composer answers it.
  const choice =
    pendingInput?.kind === "question" && pendingInput.options.length > 0
      ? pendingInput
      : null;
  const question = useMemo<AssistantQuestion | null>(
    () =>
      choice && {
        id: choice.requestId,
        title: choice.prompt,
        options: choice.options.map(({ label, description }) => ({
          label,
          description,
        })),
        multi: false,
      },
    [choice],
  );

  const answer = (indices: number[]) => {
    const option = choice?.options[indices[0]];
    if (option) void respondToInput(option.id);
  };

  // Typed text answers as written when the question takes it, else only when it names an option.
  const answerQuestion = (text: string) => {
    if (!choice) return;
    if (acceptsFreeText(choice)) {
      void respondToInput({ text });
      return;
    }
    const option = choice.options.find(
      (o) => o.label.trim().toLowerCase() === text.trim().toLowerCase(),
    );
    if (option) void respondToInput(option.id);
  };

  const dismissQuestion = () => {
    if (!choice) return;
    void respondToInput({
      text: "The user dismissed the question without answering. Continue without this information.",
    });
  };

  // The composer floats over the messages, so they need to end above it —
  // measured, because the composer grows with the input and the question card.
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  // The empty state centres above the composer at rest: following the live
  // height would shift the greeting and starters with every line typed.
  const [restingHeight, setRestingHeight] = useState(0);

  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height;
      setComposerHeight(height);
      setRestingHeight((resting) =>
        resting === 0 ? height : Math.min(resting, height),
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /*
    Hands the caret back the moment the user is the one being waited on: a turn
    that has settled, or a question card that just went up (which leaves the
    turn running, so it needs saying separately).

    `autoFocus` on the input covers only the first mount, and by here focus is
    usually on something that has just stopped being clickable — an option in
    the card above, a starter pill, the stop button — or nowhere at all, which
    is why a question could arrive with nothing to type into.

    Never taken from another field. The panel sits beside the canvas and a turn
    can settle while the user is typing in it; losing a half-written name to a
    background answer is worse than reaching for the composer by hand. A button
    or the body is fair game — nothing is being written there.
  */
  /*
    An open question is answered in the composer, so it is the one pause that
    leaves the composer standing. Everything else still takes its place.
  */
  const openQuestion =
    pendingInput && isOpenQuestion(pendingInput) ? pendingInput : null;

  const questionId = question?.id ?? null;
  useEffect(() => {
    if (turnActive && !questionId && !openQuestion) return;

    const frame = requestAnimationFrame(() => {
      const input =
        composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      if (!input || input === document.activeElement) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement)
      )
        return;
      input.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [turnActive, questionId, openQuestion?.requestId]);

  return (
    <ThreadPrimitive.Root
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
    >
      {/* Scrolls natively: the Radix ScrollArea's inline `overflow` overrode
        the viewport's and left the thread unscrollable. */}
      <ThreadPrimitive.Viewport
        autoScroll
        // `pt-8` clears the top fade so it only bites once content scrolls under it.
        className="nb-scrollbar min-h-0 flex-1 overflow-y-auto pt-8"
        style={{
          paddingLeft: CHAT_PAD.x,
          paddingRight: CHAT_PAD.x,
          paddingBottom: composerHeight + 8,
        }}
      >
        <div className="pl-2">
          <StatusContext.Provider value={status}>
            <TurnActiveContext.Provider value={turnActive}>
              <ThreadPrimitive.Messages
                components={{ UserMessage, AssistantMessage }}
              />
              {/* Inside the scroll area, after the messages: a failed turn is
                  the turn's outcome and belongs where the answer would have
                  been, not as a bar above the composer. It scrolls away with
                  the rest of the transcript. */}
              <AssistantErrorNotice error={error} />
            </TurnActiveContext.Provider>
          </StatusContext.Provider>
        </div>
      </ThreadPrimitive.Viewport>

      {/* Top fade. Stops short of the scrollbar track, which would otherwise
        fade the thumb's top. */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-8 bg-gradient-to-b from-nb-gray-925 to-transparent"
        style={{ width: `calc(100% - ${SCROLLBAR_WIDTH}px)` }}
      />

      {/* After the scroll area: the viewport covers the same box and would
        swallow clicks on the chips. */}
      <EmptyState bottomOffset={restingHeight} />

      {/* Transparent bar so messages show through beside the composer. */}
      <div
        ref={composerRef}
        className="absolute inset-x-0 bottom-0 pt-2"
        style={{ paddingLeft: CHAT_PAD.x, paddingRight: CHAT_PAD.x }}
      >
        {/* No allowance for the context chip: the lift below carries this button up already. */}
        <ThreadPrimitive.ScrollToBottom
          className="absolute -top-9 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-nb-gray-800 bg-nb-gray-900 text-nb-gray-300 shadow-md hover:text-nb-gray-100 disabled:invisible"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={15} />
        </ThreadPrimitive.ScrollToBottom>

        {/* Lifted clear of the chip, which overlaps this space without occupying it. */}
        <div
          className="transition-[margin] duration-200"
          style={{ marginBottom: context && !openQuestion ? CONTEXT_LIFT : 0 }}
        >
          <ThreadQuestion
            question={question}
            onAnswer={answer}
            onDismiss={dismissQuestion}
          />
          {openQuestion && <AssistantOpenQuestionCard request={openQuestion} />}
        </div>

        {/* `pb` here, not on the bar: the background has to reach the card's edge. */}
        <div
          className="bg-nb-gray-925"
          style={{ paddingBottom: CHAT_PAD.bottom }}
        >
          {/* The chip is absolute against this box, so it slides out from
              behind the composer's rounded body. */}
          <div className="relative">
            {pendingInput && !openQuestion && !choice ? (
              /* In the composer's place, not above it: the framework has
                 stopped answering, so an input that still accepts text would be
                 offering to queue messages behind a prompt nobody can see
                 past. The context chip goes with it — it describes what the
                 next message is about, and there is no next message yet. */
              <AssistantApprovalGate
                request={pendingInput}
                onRespond={respondToInput}
              />
            ) : (
              <>
                {/* Not while an open question is up. The chip says what the
                    next MESSAGE will carry, and an answer to a parked pause is
                    not one — it goes straight back to the framework and picks
                    up no page context on the way, so offering it would promise
                    something the answer never sends. */}
                {!openQuestion && (
                  <AssistantContextChip
                    entry={context}
                    onDismiss={onDismissContext}
                  />
                )}
                <Composer
                  question={question}
                  openQuestion={!!openQuestion}
                  onAnswer={answer}
                  onAnswerText={answerQuestion}
                  onAnswerOpen={(text) => respondToInput({ text })}
                />
              </>
            )}
          </div>
          {/* Inside the measured bar, so the messages still end above it. */}
          <p className="pb-1 pt-3 text-center text-xs leading-none text-nb-gray-500 dark:text-gray-400">
            Assistant can make mistakes. Always check details.
          </p>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}
