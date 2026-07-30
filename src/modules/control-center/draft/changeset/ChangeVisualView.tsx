import React, { useMemo } from "react";
import { cn } from "@utils/helpers";
import { ArrowRightIcon, InfoIcon } from "lucide-react";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  FieldLiveData,
  FieldRow,
  getChangeVisual,
} from "@/modules/control-center/utils/changeset-fields";

type Props = {
  change: DraftChange;
  live: FieldLiveData;
};

export const ChangeVisualView = ({ change, live }: Props) => {
  const visual = useMemo(() => getChangeVisual(change, live), [change, live]);

  return (
    <div>
      {visual.note && (
        <div
          className={
            "flex items-start gap-2 px-4 py-3 text-xs text-amber-300 border-b border-nb-gray-900"
          }
        >
          <InfoIcon size={13} className={"shrink-0 mt-[1px]"} />
          {visual.note}
        </div>
      )}

      {visual.rows.length === 0 ? (
        <div className={"text-xs text-nb-gray-400 px-4 py-3.5"}>
          No field-level changes to show.
        </div>
      ) : (
        // Peer-detail overview style: label/value rows with separators.
        visual.rows.map((row) => <FieldRowView key={row.label} row={row} />)
      )}
    </div>
  );
};

const Value = ({
  value,
  tone,
}: {
  value: string;
  tone: "add" | "remove" | "neutral";
}) => (
  <span
    className={cn(
      "text-[0.84rem] break-all",
      tone === "add" && "text-green-300",
      tone === "remove" && "text-red-300 line-through decoration-red-400/40",
      tone === "neutral" && "text-nb-gray-400",
    )}
  >
    {value}
  </span>
);

const FieldRowView = ({ row }: { row: FieldRow }) => {
  const isModified = row.before !== undefined && row.after !== undefined;
  return (
    <div
      className={
        "flex items-center justify-between gap-4 px-4 py-3.5 border-b border-nb-gray-900 last:border-b-0"
      }
    >
      <span className={"text-[0.84rem] text-nb-gray-200 shrink-0"}>
        {row.label}
      </span>
      <div
        className={"flex items-center gap-2 flex-wrap justify-end text-right"}
      >
        {isModified ? (
          <>
            <Value value={row.before as string} tone={"remove"} />
            <ArrowRightIcon size={12} className={"text-nb-gray-500 shrink-0"} />
            <Value value={row.after as string} tone={"add"} />
          </>
        ) : row.after !== undefined ? (
          <Value value={row.after} tone={"add"} />
        ) : (
          <Value value={row.before ?? "—"} tone={"remove"} />
        )}
      </div>
    </div>
  );
};
