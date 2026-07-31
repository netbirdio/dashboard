import React, { useMemo } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollBar } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { CheckIcon, CopyIcon } from "lucide-react";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  buildChangeRequest,
  changeDiffLines,
  HttpMethod,
  LiveData,
} from "@/modules/control-center/utils/changeset-request";
import { DiffLine, formatBody } from "@/modules/control-center/utils/json-line-diff";

const METHOD_CLASS: Record<HttpMethod, string> = {
  POST: "bg-green-900/30 text-green-400 border-green-500/20",
  PUT: "bg-orange-900/30 text-orange-400 border-orange-500/20",
  DELETE: "bg-red-900/30 text-red-400 border-red-500/20",
};

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
  // The accordion header already shows METHOD /path + copy, so it hides this.
  hideHeader?: boolean;
};

export const ChangeCodeView = ({ change, live, hideHeader = false }: Props) => {
  const after = useMemo(() => buildChangeRequest(change, live), [change, live]);
  const lines = useMemo(() => {
    const diff = changeDiffLines(change, live);
    if (diff.length > 0) return diff;
    // Never show an empty body. A create/update/install renders its request
    // body as added lines; a bodiless DELETE with no reconstructable "before"
    // falls back to its request line so there's always something to read.
    const formatted = formatBody(after.body);
    if (formatted !== null) {
      return formatted
        .split("\n")
        .map((text) => ({ kind: "add" as const, text }));
    }
    return [{ kind: "context" as const, text: `${after.method} ${after.path}` }];
  }, [change, live, after]);

  // Old/new line numbers, GitHub unified-diff style: removed lines number the
  // old side, added lines the new side, context both.
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

  const copyText = [
    `${after.method} ${after.path}`,
    after.body !== undefined ? `\n${formatBody(after.body)}` : "",
  ].join("");

  return (
    <div className={"flex flex-col gap-2"}>
      {!hideHeader && (
        <RequestHeader
          method={after.method}
          path={after.path}
          copyText={copyText}
        />
      )}
      {/* Bounded, scrollable code block (its own scroll area) so a long diff
          doesn't grow the accordion — vertical + long lines both scroll.
          Radix ScrollArea built from primitives so the VIEWPORT (not a
          fixed-height root) carries the max-height — it sizes to content up to
          24rem, then scrolls, with the styled scrollbars. */}
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

const RequestHeader = ({
  method,
  path,
  copyText,
}: {
  method: HttpMethod;
  path: string;
  copyText: string;
}) => {
  const [wrapper, copy, copied] = useCopyToClipboard(copyText);
  return (
    <div
      ref={wrapper}
      className={"flex items-center gap-2.5 font-mono text-xs group"}
    >
      <span
        className={cn(
          "px-1.5 py-1 rounded border font-medium leading-none",
          METHOD_CLASS[method],
        )}
      >
        {method}
      </span>
      <span className={"text-nb-gray-200 truncate"}>{path}</span>
      <button
        onClick={() => copy("Request copied to clipboard")}
        className={
          "ml-auto p-1 rounded text-nb-gray-400 hover:text-nb-gray-200 hover:bg-nb-gray-800 transition-all"
        }
        aria-label={"Copy request"}
      >
        {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
      </button>
    </div>
  );
};
