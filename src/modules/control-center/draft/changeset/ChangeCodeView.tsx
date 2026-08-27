import React, { useMemo } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  buildChangeRequest,
  changeDiffLines,
  LiveData,
} from "@/modules/control-center/utils/changeset-request";
import { DiffLine, formatBody } from "@/modules/control-center/utils/json-line-diff";

const LINE_CLASS: Record<DiffLine["kind"], string> = {
  add: "bg-green-500/10 text-green-300",
  remove: "bg-red-500/10 text-red-300",
  context: "text-nb-gray-300",
};

const GUTTER: Record<DiffLine["kind"], string> = {
  add: "+",
  remove: "−",
  context: " ",
};

type Props = {
  change: DraftChange;
  live: LiveData;
};

export const ChangeCodeView = ({ change, live }: Props) => {
  const after = useMemo(() => buildChangeRequest(change, live), [change, live]);
  const lines = useMemo(() => {
    const diff = changeDiffLines(change, live);
    if (diff.length > 0) return diff;
    // Never show an empty body: a bodiless DELETE with no reconstructable
    // "before" falls back to its request line.
    const formatted = formatBody(after.body);
    if (formatted !== null) {
      return formatted
        .split("\n")
        .map((text) => ({ kind: "add" as const, text }));
    }
    return [{ kind: "context" as const, text: `${after.method} ${after.path}` }];
  }, [change, live, after]);

  // Unified-diff numbering: removed lines number the old side, added the new.
  const numbered = useMemo(() => {
    let oldN = 0;
    let newN = 0;
    return lines.map((line) => {
      let left = "";
      let right = "";
      if (line.kind === "context") {
        left = String(++oldN);
        right = String(++newN);
      } else if (line.kind === "remove") {
        left = String(++oldN);
      } else {
        right = String(++newN);
      }
      return { ...line, left, right };
    });
  }, [lines]);

  return (
    <div className={"flex flex-col gap-2"}>
      {/* Radix primitives so the VIEWPORT (not a fixed-height root) carries the
          max-height: sizes to content up to 24rem, then scrolls. */}
      <ScrollAreaPrimitive.Root className={"relative overflow-hidden w-full"}>
        <ScrollAreaPrimitive.Viewport
          className={"max-h-[24rem] w-full rounded-[inherit]"}
        >
          <div
            className={"font-mono text-xs leading-relaxed w-max min-w-full"}
          >
            {numbered.map((line, i) => (
              <div
                key={i}
                className={cn("flex whitespace-pre", LINE_CLASS[line.kind])}
              >
                <span
                  className={
                    "select-none w-9 shrink-0 text-right pr-2 text-nb-gray-600"
                  }
                >
                  {line.left}
                </span>
                <span
                  className={
                    "select-none w-9 shrink-0 text-right pr-3 text-nb-gray-600"
                  }
                >
                  {line.right}
                </span>
                <span
                  className={"select-none w-4 shrink-0 text-center opacity-70"}
                >
                  {GUTTER[line.kind]}
                </span>
                <span className={"pr-4"}>{line.text}</span>
              </div>
            ))}
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar orientation={"vertical"} />
        <ScrollBar orientation={"horizontal"} />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
};
