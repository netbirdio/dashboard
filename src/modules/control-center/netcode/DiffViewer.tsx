import * as React from "react";
import { useMemo } from "react";
import { cn } from "@utils/helpers";
import { FileTextIcon, MinusIcon, PlusIcon } from "lucide-react";
import { ScrollArea } from "@components/ScrollArea";
import {
  DiffLine,
  parseUnifiedDiff,
} from "@/modules/control-center/netcode/parse-diff";

type Props = {
  diff: string;
  title?: string;
  className?: string;
  maxHeightClass?: string;
  emptyMessage?: string;
};

const ROW_STYLES: Record<
  DiffLine["kind"],
  { row: string; gutter: string; text: string }
> = {
  add: {
    row: "bg-green-950/25",
    gutter: "bg-green-950/40 text-green-500/70",
    text: "text-green-300",
  },
  remove: {
    row: "bg-red-950/25",
    gutter: "bg-red-950/40 text-red-500/70",
    text: "text-red-300",
  },
  hunk: {
    row: "bg-nb-gray-920/70",
    gutter: "bg-nb-gray-920/70 text-nb-gray-500",
    text: "text-sky-300/80 font-medium",
  },
  meta: {
    row: "bg-nb-gray-920/40",
    gutter: "bg-nb-gray-920/40 text-nb-gray-600",
    text: "text-nb-gray-500",
  },
  context: {
    row: "",
    gutter: "text-nb-gray-600",
    text: "text-nb-gray-300",
  },
};

const MARKERS: Partial<Record<DiffLine["kind"], React.ReactNode>> = {
  add: <PlusIcon size={10} className={"text-green-400"} />,
  remove: <MinusIcon size={10} className={"text-red-400"} />,
};

export const DiffViewer = ({
  diff,
  title = "Configuration Changes",
  className,
  maxHeightClass = "max-h-[420px]",
  emptyMessage = "No configuration changes.",
}: Props) => {
  const { lines, stats } = useMemo(() => parseUnifiedDiff(diff), [diff]);

  return (
    <div
      className={cn(
        "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 overflow-hidden",
        className,
      )}
    >
      <div
        className={
          "flex items-center gap-2 px-3.5 py-2.5 border-b border-nb-gray-910 text-xs font-medium text-nb-gray-200"
        }
      >
        <FileTextIcon size={14} className={"text-nb-gray-300"} />
        {title}
        {lines.length > 0 && (
          <DiffStats
            additions={stats.additions}
            deletions={stats.deletions}
            className={"ml-auto"}
          />
        )}
      </div>

      {lines.length === 0 ? (
        <div className={"px-3.5 py-3 text-xs text-nb-gray-400"}>
          {emptyMessage}
        </div>
      ) : (
        <ScrollArea className={maxHeightClass}>
          {/* w-0 min-w-full lets long lines scroll horizontally instead of
              widening the modal */}
          <div className={"w-0 min-w-full font-mono text-[0.7rem] leading-5"}>
            {lines.map((line, index) => {
              const style = ROW_STYLES[line.kind];
              return (
                <div key={index} className={cn("flex items-start", style.row)}>
                  <div
                    className={cn(
                      "shrink-0 w-9 px-1 text-right tabular-nums select-none border-r border-nb-gray-910/60",
                      style.gutter,
                    )}
                  >
                    {line.oldLine ?? ""}
                  </div>
                  <div
                    className={cn(
                      "shrink-0 w-9 px-1 text-right tabular-nums select-none border-r border-nb-gray-910/60",
                      style.gutter,
                    )}
                  >
                    {line.newLine ?? ""}
                  </div>
                  <div
                    className={cn(
                      "shrink-0 w-4 flex items-center justify-center",
                      style.gutter,
                    )}
                  >
                    {MARKERS[line.kind]}
                  </div>
                  <div className={cn("flex-1 pl-2 pr-3 whitespace-pre", style.text)}>
                    {line.content || " "}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export const DiffStats = ({
  additions,
  deletions,
  filesChanged,
  className,
}: {
  additions: number;
  deletions: number;
  filesChanged?: number;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-3 text-[0.7rem]", className)}>
    <span className={"flex items-center gap-1 text-green-400"}>
      <PlusIcon size={11} />
      {additions}
    </span>
    <span className={"flex items-center gap-1 text-red-400"}>
      <MinusIcon size={11} />
      {deletions}
    </span>
    {filesChanged !== undefined && (
      <span className={"flex items-center gap-1 text-nb-gray-400"}>
        <FileTextIcon size={11} />
        {filesChanged}
      </span>
    )}
  </div>
);
