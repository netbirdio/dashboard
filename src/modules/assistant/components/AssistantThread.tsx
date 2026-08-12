/**
 * The chat thread: message list, composer, and the question card, assembled from
 * assistant-ui primitives and styled with the dashboard's own tokens.
 */
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
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Cable,
  Check,
  ChevronRight,
  Copy,
  Lightbulb,
  PenLine,
  RotateCw,
  ShieldCheck,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import NetBirdLogoMark from "@/assets/netbird.svg";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { CHAT_PAD } from "../AssistantPanelContext";
import type { AssistantContextEntry } from "../context/AssistantContextProvider";
import { useRestorePlaceholders } from "../privacy/RedactorContext";
import { COMPONENT_PART } from "../runtime/useAssistantRuntime";
import { ASK_USER_TOOL } from "../tools/clientTools";
import { ContextChip } from "./ContextChip";
import { InlineComponent } from "./InlineComponent";
import { MarkdownText } from "./MarkdownText";
import {
  type AssistantQuestion,
  parseOptionNumbers,
  QuestionCard,
} from "./QuestionCard";
import { SourceCard, SourceGroup } from "./SourceList";
import { ToolActivity } from "./ToolActivity";

/** Width of the `.nb-scrollbar` track, so overlays can stop short of it. */
const SCROLLBAR_WIDTH = 10;

/**
 * How far the context chip reaches above the composer, in px.
 *
 * The chip is positioned out of the flow so it can slide out from behind the
 * composer without shoving the thread around — which means anything else that
 * sits just above the composer has to be told about it. Its height (8 + ~20 +
 * 28) less the 20px that stay tucked under the composer.
 */
const CONTEXT_LIFT = 50;

/**
 * What the assistant is doing, published to the message that's running so the
 * indicator can sit inside it — under the step it belongs to — rather than
 * floating at the bottom of the thread.
 */
const StatusContext = createContext<string | null>(null);

/**
 * Which parts belong in the steps panel: the model's reasoning, and the tool
 * calls that are *work*. Components and the question card are output, not
 * steps, so they stay in the answer where the model put them.
 */
const groupSteps = (part: { type: string; toolName?: string }) => {
  // Sources are a citation list, not a step — they get their own group so the
  // pill survives the steps panel collapsing.
  if (part.type === "source") return ["group-sources"] as const;
  if (part.type === "reasoning") return ["group-steps"] as const;
  return part.type === "tool-call" &&
    part.toolName !== COMPONENT_PART &&
    part.toolName !== ASK_USER_TOOL
    ? (["group-steps"] as const)
    : null;
};

/**
 * Below this a summary hides more than it saves: one or two rows are shorter
 * than the line that would replace them, and they say what actually happened.
 */
const SUMMARIZE_FROM = 3;

/**
 * Plain (non-Markdown) text with placeholders restored. Used for user messages:
 * picking an option sends the placeholder form, so without this the user would
 * see their own question echoed back as `{PEER_1}`.
 */
function RestoredText({ text }: { text: string }) {
  const restore = useRestorePlaceholders();
  return <span className="whitespace-pre-wrap">{restore(text)}</span>;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mb-5 flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-br-sm bg-nb-gray-900 px-3 py-2 text-sm text-nb-gray-100">
        <MessagePrimitive.Parts components={{ Text: RestoredText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

const actionClass =
  "flex h-7 w-7 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-nb-gray-100 disabled:pointer-events-none disabled:opacity-30";

/**
 * Copy, the way the rest of the dashboard does it: `useCopyToClipboard`, which
 * fires the standard "Copied to clipboard" notification and clears its own
 * confirmation. Not `ActionBarPrimitive.Copy` — that keeps the copied flag in
 * message state, and it copies the raw part text, so an answer full of
 * `{PEER_1}` placeholders would land on the clipboard as placeholders.
 */
function CopyAction() {
  const restore = useRestorePlaceholders();
  const text = useAuiState((s) =>
    s.message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim(),
  );
  const [, copyToClipboard, copied] = useCopyToClipboard(restore(text));

  return (
    <button
      type="button"
      aria-label="Copy answer"
      title="Copy"
      disabled={!text}
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

/**
 * Copy / thumbs up / thumbs down, revealed on hover over the message.
 *
 * Hidden while the thread is running: acting on a half-written answer copies
 * a fragment and rates something that isn't finished.
 */
function MessageActions() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100"
    >
      <CopyAction />

      <ActionBarPrimitive.FeedbackPositive
        aria-label="Good answer"
        title="Good answer"
        className={cn(actionClass, "data-[submitted]:text-green-500")}
      >
        <ThumbsUp size={14} />
      </ActionBarPrimitive.FeedbackPositive>

      <ActionBarPrimitive.FeedbackNegative
        aria-label="Bad answer"
        title="Bad answer"
        className={cn(actionClass, "data-[submitted]:text-red-400")}
      >
        <ThumbsDown size={14} />
      </ActionBarPrimitive.FeedbackNegative>
    </ActionBarPrimitive.Root>
  );
}

/**
 * The model's own thinking. It reads as another step in the panel — same colour
 * as the tool rows, italic to mark it as working-out rather than something the
 * assistant is telling you. Restored, since the model reasons in the same
 * `{PEER_1}` placeholders it answers in.
 */
function ReasoningText({ text }: { text: string }) {
  const restore = useRestorePlaceholders();

  return (
    <div className="flex items-start gap-2 py-1">
      {/* `h-5` is the text's line height, so the glyph centres on the *first*
          line. At `h-4` with the row stretching, a multi-line block parked it
          halfway down the paragraph. */}
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
        <Lightbulb size={13} className="text-nb-gray-300" />
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-chat italic text-nb-gray-300">
        {restore(text)}
      </p>
    </div>
  );
}

/**
 * Reasoning and tool calls, as one thing rather than a stack of rows.
 *
 * While the turn runs the steps are the only progress there is, so they show
 * live. Once it settles they collapse to a single line — by then what matters is
 * the answer, and how it was reached is available if asked for.
 */
function StepsPanel({
  running,
  count,
  children,
}: {
  running: boolean;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (running || count < SUMMARIZE_FROM) {
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

  return (
    <MessagePrimitive.Root className="group/message mb-6 mt-1.5">
      <div className="max-w-full">
        {/*
          Grouped rather than a flat list of parts: the trail is coalesced into
          one panel, and the trailing `indicator` slot puts the working line
          inside the message — directly under whatever step is running.
        */}
        <MessagePrimitive.GroupedParts groupBy={groupSteps} indicator="no-text">
          {({ part, children }) => {
            switch (part.type) {
              case "group-sources":
                return (
                  <SourceGroup count={part.indices.length}>
                    {children}
                  </SourceGroup>
                );
              case "group-steps":
                return (
                  <StepsPanel
                    running={part.status?.type === "running"}
                    count={part.indices.length}
                  >
                    {children}
                  </StepsPanel>
                );
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <ReasoningText text={part.text} />;
              // `source` also covers document citations, which carry no URL.
              // Ours are always pages the server fetched.
              case "source":
                return part.sourceType === "url" ? (
                  <SourceCard url={part.url} title={part.title ?? ""} />
                ) : null;
              case "tool-call":
                if (part.toolName === ASK_USER_TOOL) return null;
                return part.toolName === COMPONENT_PART ? (
                  <InlineComponent {...part} />
                ) : (
                  <ToolActivity {...part} />
                );
              case "indicator":
                return <WorkingIndicator status={status} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        {/*
          What went wrong is already in the message text (see
          `describeAssistantError`), so this adds the one thing prose can't: a
          way to act on it. Repeating "something went wrong" here just pushed
          the useful sentence further up the thread.
        */}
        <MessagePrimitive.Error>
          <ActionBarPrimitive.Reload className="mt-4 flex items-center gap-1.5 rounded-md border border-nb-gray-800 px-2 py-1 text-xs text-nb-gray-300 transition-colors hover:border-nb-gray-700 hover:text-nb-gray-100 disabled:opacity-40">
            <RotateCw size={12} />
            Try again
          </ActionBarPrimitive.Reload>
        </MessagePrimitive.Error>

        <AuiIf condition={(s) => s.message.parts.length > 0}>
          <MessageActions />
        </AuiIf>
      </div>
    </MessagePrimitive.Root>
  );
}

/**
 * That the assistant is working, rendered in the message's trailing indicator
 * slot — so it sits under the step that's running rather than at the bottom of
 * the thread. Without it a question that spends five seconds in a tool call
 * looks like nothing happened.
 *
 * `status` goes null as soon as text starts streaming; from there the answer
 * appearing word by word is the progress indicator.
 *
 * The mark sits in the same 16px box `ToolActivity` uses for its icon, so this
 * line and the step above it start their text on the same column.
 */
function WorkingIndicator({ status }: { status: string | null }) {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2 py-1">
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

/**
 * Things to *do*, not questions to ask — an empty panel is easier to start from
 * with a task than with a query. Labels name the job the way you'd write it on
 * a ticket ("Set Up Access Control"), since a pill has no room to explain
 * itself; the prompt behind it carries the detail and asks the agent to find
 * out the specifics before answering.
 *
 * Icons are declared rather than derived from the wording — the list is fixed,
 * so guessing from keywords earns nothing. All four are Lucide glyphs: the
 * dashboard's own nav SVGs are filled shapes and read heavier than the label
 * beside them at this size.
 *
 * Local rather than from `GET /v1/suggestions`: the server sends full sentences,
 * which don't fit a pill.
 */
const STARTERS: {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "Draft Network Changes",
    prompt:
      "Help me draft a change to my network. Ask what I'm connecting and who needs to reach it, then propose the networks, nodes and access rules I can review and deploy together.",
    icon: <PenLine size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "Set Up Access Control",
    prompt:
      "Help me set up access control. Work out which groups should reach what, then tell me what to change.",
    icon: <ShieldCheck size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "Troubleshoot Connectivity",
    prompt: "A peer can't reach something it should. Help me work out why.",
    icon: <Cable size={13} className="shrink-0 text-nb-gray-200" />,
  },
  {
    label: "Look It Up in the Docs",
    prompt:
      "Answer this from the NetBird documentation. Ask me what I'm trying to do, then explain it and link the page.",
    icon: <BookOpen size={13} className="shrink-0 text-nb-gray-200" />,
  },
];

/**
 * Greeting, blurb and starter prompts for a chat nobody has said anything in
 * yet. Positioned over the message area rather than inside it: centring on the
 * scroll content would put it wherever the content happened to be tall enough
 * to reach, and this needs to sit in the middle of the space the user sees.
 */
function EmptyState({ bottomOffset }: { bottomOffset: number }) {
  const aui = useAui();
  const { loggedInUser } = useLoggedInUser();
  // Just the first name — "Good morning, Eduard Gert" reads like a letterhead.
  const firstName = loggedInUser?.name?.trim().split(/\s+/)[0];

  // Sends outright: a starter is a whole question already, and making the user
  // press enter on text they didn't write is a second decision for nothing.
  const start = (prompt: string) => aui.thread.append(prompt);

  return (
    <ThreadPrimitive.Empty>
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
            {/* An `h1` for the page-heading styling, not for the outline: the
                panel sits beside a page that has its own heading. A step down
                from the page titles' `text-2xl` — it's a panel, not a page. */}
            <h1 aria-hidden="true" className="text-xl">
              {firstName
                ? `${timeOfDayGreeting()}, ${firstName}!`
                : `${timeOfDayGreeting()}!`}
            </h1>
          </div>
          {/* Same component the page headers use, so the blurb matches them. */}
          <Paragraph className="justify-center">
            Get started with some examples
          </Paragraph>
        </div>

        {/* Pills sized to their labels, wrapping on their own — two to a row at
            the panel's width. The cap keeps them from stringing out into one
            long line when the panel is opened as a full-width overlay. */}
        <div className="flex max-w-[30rem] flex-wrap justify-center gap-2.5">
          {STARTERS.map((starter) => (
            <button
              key={starter.prompt}
              type="button"
              onClick={() => start(starter.prompt)}
              title={starter.prompt}
              /* A filled pill a step above the panel, outlined only just
                 enough to keep its edge — at this size a visible border is
                 most of what you see, and four of them read as a toolbar
                 rather than as four things to try. */
              className="inline-flex items-center gap-1.5 rounded-full border border-nb-gray-850 bg-nb-gray-900 px-3 py-1.5 text-xs text-nb-gray-300 transition-colors hover:border-nb-gray-800 hover:bg-nb-gray-850 hover:text-nb-gray-100"
            >
              {starter.icon}
              {starter.label}
            </button>
          ))}
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
}

/**
 * The question card, wired to the thread.
 *
 * Options are written by the model, so they carry placeholders. What gets
 * *sent* stays in placeholder form — the model already understands those
 * tokens, and restoring it would push real names back across the privacy
 * boundary. Only what the user reads is restored (inside the card).
 *
 * Hidden while a turn is running: its options answer the last message, and the
 * next one is already on its way.
 */
function ThreadQuestion({
  question,
  onAnswer,
  onDismiss,
}: {
  question: AssistantQuestion | null;
  onAnswer: (indices: number[]) => void;
  onDismiss: () => void;
}) {
  if (!question) return null;

  return (
    <ThreadPrimitive.If running={false}>
      <QuestionCard
        // Resets the multi-select picks when a new question arrives.
        key={question.id}
        question={question}
        onAnswer={onAnswer}
        onDismiss={onDismiss}
      />
    </ThreadPrimitive.If>
  );
}

function composerPlaceholder(question: AssistantQuestion | null): string {
  if (!question) return "How can I help you today?";
  return question.multi
    ? "Tick what applies, or type your answer"
    : "Pick an option, or type your answer";
}

function Composer({
  question,
  onAnswer,
  inputRef,
}: {
  question: AssistantQuestion | null;
  onAnswer: (indices: number[]) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const aui = useAui();

  /*
    Typing "1" or "1,3" while a card is up picks those options instead of
    sending the digits as a message. Captured on the way down so it lands
    before the textarea's own Enter handler, which would otherwise submit the
    literal text.
  */
  const answerByNumber = (event: React.KeyboardEvent) => {
    if (!question) return;
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;

    const composer = aui.thread.composer();
    const indices = parseOptionNumbers(
      composer.getState().text,
      question.options.length,
      question.multi,
    );
    if (!indices) return;

    event.preventDefault();
    event.stopPropagation();
    composer.setText("");
    onAnswer(indices);
  };

  return (
    /*
      Colours, border and focus ring follow `Input`'s `default` variant — it's the
      same kind of control, so it shouldn't invent its own surface. The shape
      stays a rounded box (not `Input`'s `rounded-md`) because this one grows to
      several lines and carries the send button inside it.
    */
    <ComposerPrimitive.Root
      onKeyDownCapture={answerByNumber}
      className={cn(
        "flex flex-col gap-1 rounded-2xl border pl-3 pr-2 py-2",
        // Explicitly layered above the context chip: the chip animates, and an
        // element with a transform or an opacity paints above plain siblings
        // whatever the DOM order says.
        "relative z-10",
        "border-nb-gray-700 bg-nb-gray-900",
        "ring-offset-nb-gray-950/50 focus-within:ring-2 focus-within:ring-neutral-500/20 focus-within:ring-offset-2",
      )}
    >
      <ComposerPrimitive.Input
        ref={inputRef}
        rows={1}
        autoFocus
        // With options on the table, the invitation is to answer them — and the
        // placeholder is where "or say something else" belongs, since the card
        // itself shouldn't spend a line saying so.
        placeholder={composerPlaceholder(question)}
        className="max-h-32 min-h-[38px] w-full resize-none bg-transparent px-0.5 py-1.5 text-sm text-nb-gray-100 outline-none placeholder:text-neutral-400/70"
      />

      <div className="flex items-center justify-end gap-2">
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send
            aria-label="Send"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              "bg-netbird-500 text-white hover:bg-netbird-500/90",
              // Nothing to send yet: a filled accent button reads as the primary
              // action even while it's inert.
              "disabled:bg-nb-gray-900 disabled:text-nb-gray-500",
            )}
          >
            <ArrowUp size={16} />
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>

        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel
            aria-label="Stop"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-nb-gray-700 text-nb-gray-300 hover:text-nb-gray-100"
          >
            <Square size={11} />
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
}

export interface AssistantThreadProps {
  /** Tappable options to offer under the answer, or null for none. */
  question: AssistantQuestion | null;
  /** Take the card away (answered or dismissed). */
  onDismissQuestion: () => void;
  /** What the user is looking at in the dashboard, or null. */
  context: AssistantContextEntry | null;
  /** Detach the context from the next message. */
  onDismissContext: () => void;
  /** Current step from the runtime, or null while the answer is streaming. */
  status: string | null;
  className?: string;
}

export function AssistantThread({
  question,
  onDismissQuestion,
  context,
  onDismissContext,
  status,
  className,
}: AssistantThreadProps) {
  const aui = useAui();

  const answer = (indices: number[]) => {
    if (!question) return;
    aui.thread.append(
      indices.map((index) => question.options[index].label).join(", "),
    );
    onDismissQuestion();
  };

  /*
    The composer floats over the messages instead of sitting below them, so the
    scroll track runs the full height of the panel. That means the messages need
    to end above it — measured rather than guessed, because the composer grows
    with the input and with the follow-up chips.
  */
  const composerRef = useRef<HTMLDivElement>(null);
  // Shared with the empty state, which prefills the composer and hands the
  // caret over.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setComposerHeight(entry.contentRect.height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <ThreadPrimitive.Root
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
    >
      {/*
        Scrolls natively rather than through the dashboard's Radix `ScrollArea`:
        that wrapper puts its own inline `overflow` on whatever it adopts via
        `asChild`, which overrode the viewport's and left the thread unscrollable.
        `nb-scrollbar` keeps the styled thumb that wrapper would have drawn.
      */}
      <ThreadPrimitive.Viewport
        autoScroll
        // `pt-8` clears the fade below, so at rest it lies over blank space and
        // only bites once something scrolls under it.
        className="nb-scrollbar min-h-0 flex-1 overflow-y-auto pt-8"
        style={{
          paddingLeft: CHAT_PAD.x,
          paddingRight: CHAT_PAD.x,
          paddingBottom: composerHeight + 8,
        }}
      >
        {/*
          The transcript sits a little further in than the rest of the column.
          It's the only part that's pure reading, and `CHAT_PAD.x` is set by
          the composer and header, which are controls and want to reach closer
          to the panel's edges.
        */}
        <div className="pl-2">
          <StatusContext.Provider value={status}>
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage }}
            />
          </StatusContext.Provider>
        </div>
      </ThreadPrimitive.Viewport>

      {/*
        Messages scrolling out of the top dissolve into the panel instead of being
        sliced off at the header's edge. Always painted — the viewport's matching
        top padding keeps it off the first message, so it needs no scroll position
        to know when to show.

        Stops short of the scrollbar's track (`SCROLLBAR_WIDTH`, see
        `.nb-scrollbar`) rather than spanning the full width: over the track it
        would fade the top of the thumb along with the text.
      */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-8 bg-gradient-to-b from-nb-gray-925 to-transparent"
        style={{ width: `calc(100% - ${SCROLLBAR_WIDTH}px)` }}
      />

      {/*
        After the scroll area, not before: the viewport covers the same box, so
        rendering this first left it painted under an element that also swallowed
        clicks on the chips.
      */}
      <EmptyState bottomOffset={composerHeight} />

      {/*
        Transparent bar so messages show through beside the follow-up chips, with
        the panel colour applied only around the composer — that band is what
        makes the thread end at the composer instead of sliding under it.
      */}
      <div
        ref={composerRef}
        className="absolute inset-x-0 bottom-0 pt-2"
        style={{ paddingLeft: CHAT_PAD.x, paddingRight: CHAT_PAD.x }}
      >
        {/* `-top-9` clears its own height plus a little. No allowance for the
            context chip: this bar is bottom-anchored, so the lift below makes
            it taller and carries its top edge — and this button — up already. */}
        <ThreadPrimitive.ScrollToBottom
          className="absolute -top-9 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-nb-gray-800 bg-nb-gray-900 text-nb-gray-300 shadow-md hover:text-nb-gray-100 disabled:invisible"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={15} />
        </ThreadPrimitive.ScrollToBottom>

        {/* Lifted clear of the chip, which overlaps this space without
            occupying it. */}
        <div
          className="transition-[margin] duration-200"
          style={{ marginBottom: context ? CONTEXT_LIFT : 0 }}
        >
          <ThreadQuestion
            question={question}
            onAnswer={answer}
            onDismiss={onDismissQuestion}
          />
        </div>

        {/* `pb` here, not on the bar: the background has to reach the card's
            edge, and this is also the composer's lift off it. */}
        <div
          className="bg-nb-gray-925"
          style={{ paddingBottom: CHAT_PAD.bottom }}
        >
          {/* The chip is absolute against this box, so it slides out from
              behind the composer without moving anything. It has to live here
              rather than above the band: the band's flat background would do
              the covering, and the tuck would read as the slab being cut off
              instead of sitting behind a rounded box. */}
          <div className="relative">
            <ContextChip entry={context} onDismiss={onDismissContext} />
            <Composer
              question={question}
              onAnswer={answer}
              inputRef={inputRef}
            />
          </div>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

export default AssistantThread;
