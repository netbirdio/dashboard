// One card for both producers — the `question` event and the `suggestions`
// pass — since the interaction is the same: answer, dismiss, or just type.
"use client";

import { cn } from "@utils/helpers";
import { ArrowUp, Check, X } from "lucide-react";
import { useState } from "react";

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface AssistantQuestion {
  id: string;
  title: string;
  options: QuestionOption[];
  multi: boolean;
}

// "2", "1,3", "1 3" → option indices, or null when the text isn't a pick.
// Deliberately strict: anything with a word in it must be sent as written.
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
  onAnswer: (indices: number[]) => void;
  onDismiss: () => void;
}

export function AssistantQuestionCard({
  question,
  onAnswer,
  onDismiss,
}: Readonly<QuestionCardProps>) {
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
    <div className="mb-3 rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 pb-2.5 pt-3.5">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-chat font-normal text-nb-gray-100">
          {question.title}
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
                  // Negative margin lets the hover fill reach past the text
                  // while the content stays aligned with the question above.
                  "group -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left",
                  "hover:bg-nb-gray-800",
                )}
              >
                {multi ? (
                  /* Drawn, not a real checkbox: a focusable control inside a
                     button is invalid, so the button carries role and state. */
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
                  /* The number is the keyboard shortcut: typing "1" sends this option. */
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-nb-gray-800 text-xs tabular-nums text-nb-gray-200 group-hover:bg-nb-gray-700 group-hover:text-white">
                    {index + 1}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block text-chat font-normal text-nb-gray-300 group-hover:text-nb-gray-100">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block text-xs text-nb-gray-400">
                      {option.description}
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

          {/* `-mr-2` bridges the card/composer padding difference so this
              lines up with the composer's send button. */}
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
