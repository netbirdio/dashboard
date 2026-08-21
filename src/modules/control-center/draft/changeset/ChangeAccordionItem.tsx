import React, { useMemo, useState } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { AccordionContent, AccordionItem } from "@components/Accordion";
import { cn } from "@utils/helpers";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  Loader2,
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
  getChangeIssue,
  getChangeKind,
} from "@/modules/control-center/draft/DraftChangesetContext";
import {
  buildChangeRequest,
  changeDiffLines,
  LiveData,
  toCurl,
} from "@/modules/control-center/utils/changeset-request";
import { CascadePreview } from "@/modules/control-center/utils/change-cascade";
import { diffStat } from "@/modules/control-center/utils/json-line-diff";
import {
  changeIcon,
  DiffStat,
  entityName,
  IssueBadge,
  KindBadge,
} from "@/modules/control-center/draft/changeset/change-presentation";
import { ChangeCodeView } from "@/modules/control-center/draft/changeset/ChangeCodeView";
import { DeployStatus } from "@/modules/control-center/hooks/useDeployChangeset";

type Props = {
  change: DraftChange;
  live: LiveData;
  onDiscard: () => void;
  // Side-effect preview for the remove confirmation (what else the removal
  // touches on the canvas / in other changes).
  previewRemove: (change: DraftChange) => CascadePreview;
  // Resolve a blocking issue on this change (assign a network / install the
  // peer). Undefined for changes with no issue.
  onResolveIssue?: (change: DraftChange) => void;
  disabled: boolean;
  // Deploy progress: undefined = not started; "deploying" spins + pulses;
  // "done" shows a green check; "error" reverts to the actions menu.
  status?: DeployStatus;
};

export const ChangeAccordionItem = ({
  change,
  live,
  onDiscard,
  previewRemove,
  onResolveIssue,
  disabled,
  status,
}: Props) => {
  const apiCall = getChangeApiCall(change);
  // Clicking the URL copies the full request as a curl command (API-docs
  // format) with a <TOKEN> placeholder.
  const request = useMemo(
    () => buildChangeRequest(change, live),
    [change, live],
  );
  const copyText = toCurl(request);
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

  // The header shows a GitHub-style +/- diffstat instead of the kind badge
  // whenever the change produces a diff.
  const stat = useMemo(
    () => diffStat(changeDiffLines(change, live)),
    [change, live],
  );
  const showStat = stat.additions + stat.deletions > 0;
  // A blocking issue (e.g. a resource with no network) replaces the
  // diffstat/kind badge with an issue badge and rings the row.
  const issue = getChangeIssue(change);

  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm } = useDialog();
  const handleRemove = async () => {
    setMenuOpen(false);
    const preview = previewRemove(change);
    const ok = await confirm({
      title: preview.summary,
      description:
        "This reverts it on the canvas and drops it from the changeset. It won't be deployed.",
      children: preview.effects.length ? (
        <ul className={"list-disc pl-5 text-sm text-nb-gray-300 space-y-1"}>
          {preview.effects.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : undefined,
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
      data-testid={`cc-change-${change.type}`}
      className={cn(
        "border border-nb-gray-910 rounded-lg bg-nb-gray-930/40 overflow-hidden min-w-0",
        // The row being deployed pulses (no border color); state is conveyed by
        // the spinner / green check in the header.
        status === "deploying" && "animate-pulse",
      )}
    >
      {/* Fixed-height header; the trigger holds everything up to the badge. */}
      <AccordionPrimitive.Header
        className={
          "group/row flex items-stretch gap-3 pr-3 h-11 hover:bg-nb-gray-930/40 transition-colors"
        }
      >
        <AccordionPrimitive.Trigger
          disabled={disabled}
          className={cn(
            "group flex flex-1 items-center gap-3 pl-3 pr-1 text-left min-w-0",
            disabled && "cursor-default",
          )}
        >
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
          {/* The whole URL is a copy affordance (peer-page hostname pattern). */}
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

          <span className={"flex-1"} />

          {/* Right: issue badge (blocking, click to fix) → diffstat → kind badge */}
          {issue ? (
            <IssueBadge
              label={issue.label}
              waiting={issue.waiting}
              onClick={
                onResolveIssue && !disabled
                  ? () => onResolveIssue(change)
                  : undefined
              }
            />
          ) : showStat ? (
            <DiffStat additions={stat.additions} deletions={stat.deletions} />
          ) : (
            <KindBadge kind={getChangeKind(change)} />
          )}
        </AccordionPrimitive.Trigger>

        {/* While this change deploys the ⋮ becomes a spinner, then a green
            check when it lands; other rows keep their menu (disabled). */}
        {status === "deploying" ? (
          <div
            className={"self-center shrink-0 p-1.5 text-white"}
            aria-label={"Deploying"}
          >
            <Loader2 size={16} className={"animate-spin"} />
          </div>
        ) : status === "done" ? (
          <div
            className={"self-center shrink-0 p-1.5 text-green-500"}
            aria-label={"Deployed"}
          >
            <CheckIcon size={16} />
          </div>
        ) : (
          // More actions — outside the trigger (buttons can't nest).
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild={true}>
              <button
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                data-testid={"cc-change-menu"}
                className={
                  "self-center shrink-0 p-1.5 rounded text-nb-gray-400 hover:text-nb-gray-100 hover:bg-nb-gray-800 data-[state=open]:bg-nb-gray-800 data-[state=open]:text-nb-gray-100 transition-colors disabled:opacity-50 outline-none"
                }
                aria-label={"More actions"}
              >
                <MoreVerticalIcon size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={"end"}>
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
              <DropdownMenuItem
                variant={"danger"}
                className={"gap-2"}
                data-testid={"cc-change-remove"}
                onClick={handleRemove}
              >
                <Trash2Icon size={14} />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </AccordionPrimitive.Header>

      <AccordionContent animated={false}>
        {/* No outer padding — the content is flush; rows/code carry their own
            insets (peer-overview style rows, edge-to-edge code). */}
        <div className={"border-t border-nb-gray-910 min-w-0"}>
          <ChangeCodeView change={change} live={live} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
