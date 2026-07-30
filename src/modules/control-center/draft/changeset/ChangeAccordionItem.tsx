import React, { useMemo, useState } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { AccordionContent, AccordionItem } from "@components/Accordion";
import { cn } from "@utils/helpers";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { useDialog } from "@/contexts/DialogProvider";
import {
  DraftChange,
  getChangeApiCall,
  getChangeKind,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { FieldLiveData } from "@/modules/control-center/utils/changeset-fields";
import {
  buildChangeRequest,
  changeDiffLines,
  toCurl,
} from "@/modules/control-center/utils/changeset-request";
import { diffStat } from "@/modules/control-center/utils/json-line-diff";
import {
  changeIcon,
  DiffStat,
  entityName,
  KindBadge,
} from "@/modules/control-center/draft/changeset/change-presentation";
import { ChangeCodeView } from "@/modules/control-center/draft/changeset/ChangeCodeView";
import { ChangeVisualView } from "@/modules/control-center/draft/changeset/ChangeVisualView";

type Props = {
  change: DraftChange;
  live: FieldLiveData;
  // Global Visual/Code mode, owned by the modal.
  view: string;
  onDiscard: () => void;
  disabled: boolean;
};

export const ChangeAccordionItem = ({
  change,
  live,
  view,
  onDiscard,
  disabled,
}: Props) => {
  const apiCall = getChangeApiCall(change);
  // Clicking the URL copies the full request as a curl command (API-docs
  // format) with a <TOKEN> placeholder.
  const request = useMemo(
    () => buildChangeRequest(change, live),
    [change, live],
  );
  const copyText = request ? toCurl(request) : apiCall;
  // Copy via notify() directly so the toast can title "Copied as cURL request"
  // and describe the actual request (e.g. DELETE /groups/...).
  const [copied, setCopied] = useState(false);
  const doCopy = async (showInlineCheck: boolean) => {
    try {
      await navigator.clipboard.writeText(copyText);
      notify({ title: "Copied as cURL request", description: apiCall });
      if (showInlineCheck) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  };

  // In Code mode the header shows a GitHub-style +/- diffstat instead of the
  // kind badge (except install-peer, which has no diff).
  const stat = useMemo(
    () =>
      view === "code"
        ? diffStat(changeDiffLines(change, live))
        : { additions: 0, deletions: 0 },
    [view, change, live],
  );
  const showStat = view === "code" && stat.additions + stat.deletions > 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm } = useDialog();
  const handleRemove = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Remove this change?",
      description:
        "This removes it from the changeset — the change won't be deployed. This cannot be undone.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
      dismissOnOutsideClick: true,
    });
    if (ok) onDiscard();
  };

  return (
    <AccordionItem
      value={change.id}
      className={
        "border border-nb-gray-910 rounded-lg bg-nb-gray-930/40 overflow-hidden min-w-0"
      }
    >
      {/* Header has a fixed height (stays constant); the trigger holds
          everything up to the diffstat/badge, the discard ✕ sits outside it
          (buttons can't nest). */}
      <AccordionPrimitive.Header
        className={
          "group/row flex items-stretch gap-3 pr-3 h-11 hover:bg-nb-gray-930/40 transition-colors"
        }
      >
        <AccordionPrimitive.Trigger
          className={
            "group flex flex-1 items-center gap-3 pl-3 pr-1 text-left min-w-0"
          }
        >
          {/* Chevron on the left — styled like a button (hover bg), bigger
              hit area */}
          <span
            className={
              "shrink-0 -ml-1 p-1.5 rounded text-nb-gray-400 hover:text-nb-gray-200 hover:bg-nb-gray-800 transition-colors"
            }
          >
            <ChevronDownIcon
              size={16}
              className={cn(
                "transition-transform duration-200",
                "group-data-[state=open]:rotate-180",
              )}
            />
          </span>
          {/* Entity icon + name, kept tight together */}
          <span className={"flex items-center gap-2 min-w-0"}>
            <span className={"text-nb-gray-300 shrink-0 relative -top-px"}>
              {changeIcon(change)}
            </span>
            <span
              className={
                "text-xs text-nb-gray-100 font-medium truncate min-w-0 max-w-[220px]"
              }
            >
              {entityName(change)}
            </span>
          </span>
          {/* The request URL is only relevant in Code mode. The whole URL is
              copyable — click anywhere on it (peer-page hostname pattern):
              dashed underline on hover + copy/check icon. */}
          {view === "code" && (
            <span
              role={"button"}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                doCopy(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  doCopy(true);
                }
              }}
              aria-label={"Copy URL"}
              className={
                "group/copy relative top-[1px] flex items-center gap-1.5 font-mono text-[0.7rem] text-nb-gray-400 min-w-0 max-w-[18rem] cursor-pointer hover:text-nb-gray-200 transition-colors"
              }
            >
              <span className={"relative truncate min-w-0"}>
                {apiCall}
                <span
                  className={
                    "absolute bottom-0 left-0 right-0 border-b border-dashed border-transparent group-hover/copy:border-nb-gray-500 pointer-events-none"
                  }
                />
              </span>
              {copied ? (
                <CheckIcon size={12} className={"shrink-0 text-nb-gray-100"} />
              ) : (
                <CopyIcon
                  size={12}
                  className={
                    "shrink-0 opacity-0 group-hover/copy:opacity-100 transition-opacity"
                  }
                />
              )}
            </span>
          )}

          <span className={"flex-1"} />

          {/* Right: diffstat (code mode) or kind badge */}
          {showStat ? (
            <DiffStat additions={stat.additions} deletions={stat.deletions} />
          ) : (
            <KindBadge kind={getChangeKind(change)} />
          )}
        </AccordionPrimitive.Trigger>

        {/* More actions — outside the trigger (buttons can't nest). */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild={true}>
            <button
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              className={
                "self-center shrink-0 p-1.5 rounded text-nb-gray-400 hover:text-nb-gray-100 hover:bg-nb-gray-800 data-[state=open]:bg-nb-gray-800 data-[state=open]:text-nb-gray-100 transition-colors disabled:opacity-50 outline-none"
              }
              aria-label={"More actions"}
            >
              <MoreVerticalIcon size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"end"}>
            {request && (
              <DropdownMenuItem
                className={"gap-2"}
                onClick={() => {
                  doCopy(false);
                  setMenuOpen(false);
                }}
              >
                <CopyIcon size={14} />
                Copy cURL
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant={"danger"}
              className={"gap-2"}
              onClick={handleRemove}
            >
              <Trash2Icon size={14} />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </AccordionPrimitive.Header>

      <AccordionContent animated={false}>
        {/* No outer padding — the content is flush; rows/code carry their own
            insets (peer-overview style rows, edge-to-edge code). */}
        <div className={"border-t border-nb-gray-910 min-w-0"}>
          {view === "code" ? (
            <ChangeCodeView change={change} live={live} hideHeader={true} />
          ) : (
            <ChangeVisualView change={change} live={live} />
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
