/**
 * The card above the composer: a question with tappable, numbered answers.
 *
 * One component for two producers — a `question` event, where the model asked
 * something and is waiting, and the fast-tier `suggestions` pass, where the
 * options are optional next steps. They look the same because they are the same
 * interaction, and either way the way out is to answer, dismiss, or just type.
 *
 * Options are numbered because the numbers are usable: typing "1" or "1,3" in
 * the composer answers the card (see `parseOptionNumbers`), so someone with
 * their hands on the keyboard never has to reach for the mouse.
 */
"use client";

import { cn } from "@utils/helpers";
import { ArrowUp, Check, X } from "lucide-react";
import { useState } from "react";
import { useRestorePlaceholders } from "../privacy/RedactorContext";

export interface QuestionOption {
  /** Sent as-is (placeholder form); only the displayed copy is restored. */
  label: string;
  description?: string;
}

export interface AssistantQuestion {
  /** Changes per question, so the card resets its selection. */
  id: string;
  title: string;
  options: QuestionOption[];
  /** Answers that genuinely co-occur — pick several, then send. */
  multi: boolean;
}

/**
 * "2", "1,3", "1 3" → the option indices they name, or null when the text isn't
 * a pick at all. Deliberately strict: anything with a word in it is a message
 * the user typed, not a selection, and must be sent as written.
 */
export function parseOptionNumbers(
  text: string,
  count: number,
  multi: boolean,
): number[] | null {
  const trimmed = text.trim();
  if (!/^\d+([,+\s]+\d+)*$/.test(trimmed)) return null;

  const indices = trimmed.split(/[\s,+]+/).map((n) => Number(n) - 1);
  if (!multi && indices.length > 1) return null;
  if (indices.some((i) => i < 0 || i >= count)) return null;

  return [...new Set(indices)];
}

export interface QuestionCardProps {
  question: AssistantQuestion;
  /** Send the picked options as the next user message. */
  onAnswer: (indices: number[]) => void;
  /** Take the card away without saying anything. */
  onDismiss: () => void;
}

export function QuestionCard({
  question,
  onAnswer,
  onDismiss,
}: QuestionCardProps) {
  const restore = useRestorePlaceholders();
  const [picked, setPicked] = useState<number[]>([]);

  const { multi, options } = question;

  const toggle = (index: number) => {
    if (!multi) {
      onAnswer([index]);
      return;
    }
    setPicked((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
  };

  return (
    /* Same surface as the composer below it — border, fill and corner — so the
       two read as one control the user is working in, not a notice on top of
       one. */
    <div className="mb-3 rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 pb-2.5 pt-3.5">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-chat font-normal text-nb-gray-100">
          {restore(question.title)}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          title="Dismiss"
          className="-mr-1.5 -mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-800 hover:text-nb-gray-100"
        >
          <X size={15} />
        </button>
      </div>

      <ul className="mt-2.5 flex flex-col gap-0.5">
        {options.map((option, index) => {
          const selected = picked.includes(index);
          return (
            <li key={option.label}>
              <button
                type="button"
                onClick={() => toggle(index)}
                role={multi ? "checkbox" : undefined}
                aria-checked={multi ? selected : undefined}
                className={cn(
                  // No border of its own: the card already draws one, and five
                  // nested outlines in a chat panel is a lot of frame.
                  //
                  // Negative margin against the padding: the row's content
                  // lines up with the question above it, while the hover fill
                  // still reaches past the text on both sides.
                  "group -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left",
                  "hover:bg-nb-gray-800",
                )}
              >
                {multi ? (
                  /* Drawn rather than a real <input>/Radix checkbox: the row is
                     already the control, and nesting a second focusable one
                     inside a button is invalid. The button carries the
                     checkbox role and state instead. */
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border",
                      selected
                        ? "border-netbird bg-netbird text-white"
                        : "border-nb-gray-700 bg-nb-gray-920",
                    )}
                  >
                    {selected && <Check size={14} />}
                  </span>
                ) : (
                  /* The number is the keyboard shortcut ("1" sends this
                     option), so it's shown rather than implied. It steps up a
                     shade on hover — the row's own hover fill is nb-gray-800,
                     which would otherwise swallow the box. */
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-nb-gray-800 text-xs tabular-nums text-nb-gray-200 group-hover:bg-nb-gray-700 group-hover:text-white">
                    {index + 1}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  {/* Muted at rest so the list reads as offers rather than as
                      four competing answers, and brightening only under the
                      cursor — for multi-select the checkbox is the one thing
                      that marks a pick. */}
                  <span className="block text-chat font-normal text-nb-gray-300 group-hover:text-nb-gray-100">
                    {restore(option.label)}
                  </span>
                  {option.description && (
                    <span className="block text-xs text-nb-gray-400">
                      {restore(option.description)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {multi && (
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <span className="pb-1 text-xs text-nb-gray-400">
            {picked.length} selected
          </span>

          {/* The composer's send button, to the pixel: it does the same thing
              from the same corner of the same surface. `-mr-2` pulls it out to
              where that one sits — the card pads by 4, the composer by 2, so
              without it the two buttons wouldn't line up in the same column. */}
          <button
            type="button"
            aria-label="Send"
            disabled={picked.length === 0}
            onClick={() => onAnswer(picked)}
            className={cn(
              "-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              "bg-netbird-500 text-white hover:bg-netbird-500/90",
              "disabled:bg-nb-gray-900 disabled:text-nb-gray-500",
            )}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
