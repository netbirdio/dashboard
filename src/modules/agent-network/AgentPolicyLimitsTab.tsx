"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { TabsContent } from "@components/Tabs";
import { cn } from "@utils/helpers";
import { IconCirclePlus } from "@tabler/icons-react";
import {
  Edit,
  Gauge,
  MinusCircleIcon,
  MoreVertical,
  PlusCircle,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import {
  PolicyBudgetLimit,
  PolicyLimits,
  PolicyTokenLimit,
} from "@/modules/agent-network/data/mockData";

type LimitKind = "token" | "budget";

type Props = {
  limits: PolicyLimits;
  setLimits: React.Dispatch<React.SetStateAction<PolicyLimits>>;
};

export default function AgentPolicyLimitsTab({
  limits,
  setLimits,
}: Readonly<Props>) {
  const [editKind, setEditKind] = useState<LimitKind | null>(null);

  const tokenAttached = limits.tokenLimit.enabled;
  const budgetAttached = limits.budgetLimit.enabled;
  const attachedCount =
    (tokenAttached ? 1 : 0) + (budgetAttached ? 1 : 0);

  const detachToken = () =>
    setLimits((l) => ({
      ...l,
      tokenLimit: { ...l.tokenLimit, enabled: false },
    }));
  const detachBudget = () =>
    setLimits((l) => ({
      ...l,
      budgetLimit: { ...l.budgetLimit, enabled: false },
    }));

  return (
    <TabsContent value={"limits"} className={"px-8 pb-8 mt-3 relative"}>
      {editKind && (
        <LimitEditModal
          kind={editKind}
          limits={limits}
          onSave={(updated) => {
            setLimits(updated);
            setEditKind(null);
          }}
          onClose={() => setEditKind(null)}
        />
      )}

      {attachedCount > 0 ? (
        <div>
          <div className={"flex justify-between gap-10 mb-5 items-end"}>
            <div>
              <Label>
                {attachedCount} {attachedCount === 1 ? "Limit" : "Limits"}
              </Label>
              <HelpText className={"mb-0"}>
                Token and budget caps applied directly to this policy.
              </HelpText>
            </div>
            <div className={"flex items-center justify-center gap-4"}>
              <Button
                variant={"primary"}
                size={"xs"}
                disabled={tokenAttached}
                onClick={() => setEditKind("token")}
              >
                <PlusCircle size={14} />
                Add Token Limit
              </Button>
              <Button
                variant={"primary"}
                size={"xs"}
                disabled={budgetAttached}
                onClick={() => setEditKind("budget")}
              >
                <PlusCircle size={14} />
                Add Budget Limit
              </Button>
            </div>
          </div>

          <div
            className={
              "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1"
            }
          >
            {tokenAttached && (
              <LimitRow
                kind={"token"}
                limit={limits.tokenLimit}
                onEdit={() => setEditKind("token")}
                onDetach={detachToken}
              />
            )}
            {budgetAttached && (
              <LimitRow
                kind={"budget"}
                limit={limits.budgetLimit}
                onEdit={() => setEditKind("budget")}
                onDetach={detachBudget}
              />
            )}
          </div>
        </div>
      ) : (
        <NoLimitsInfo
          onAddToken={() => setEditKind("token")}
          onAddBudget={() => setEditKind("budget")}
        />
      )}
    </TabsContent>
  );
}

function LimitRow({
  kind,
  limit,
  onEdit,
  onDetach,
}: {
  kind: LimitKind;
  limit: PolicyTokenLimit | PolicyBudgetLimit;
  onEdit: () => void;
  onDetach: () => void;
}) {
  const isToken = kind === "token";
  const title = isToken ? "Token Limit" : "Budget Limit";
  const groupCap = isToken
    ? (limit as PolicyTokenLimit).groupCap
    : (limit as PolicyBudgetLimit).groupCapUsd;
  const userCap = isToken
    ? (limit as PolicyTokenLimit).userCap
    : (limit as PolicyBudgetLimit).userCapUsd;
  const groupLabel = formatCap(groupCap, isToken);
  const userLabel = formatCap(userCap, isToken);

  return (
    <div
      className={
        "flex justify-between py-2 items-center hover:bg-nb-gray-900/30 rounded-md cursor-pointer px-4 transition-all"
      }
      onClick={onEdit}
    >
      <div className={"flex items-center gap-4 min-w-[350px]"}>
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
            isToken
              ? "bg-gradient-to-tr from-indigo-500 to-indigo-400"
              : "bg-gradient-to-tr from-amber-500 to-amber-400",
          )}
        >
          {isToken ? <Gauge size={16} /> : <Wallet size={16} />}
        </div>
        <div className={"flex flex-col gap-0.5 min-w-0"}>
          <div className={"text-sm text-nb-gray-100 truncate"}>{title}</div>
          <div className={"text-xs text-nb-gray-400 truncate"}>
            Group {groupLabel} · Individual {userLabel} · resets every{" "}
            {formatWindow(limit.windowSeconds)}
          </div>
        </div>
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"default-outline"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={"w-auto min-w-[200px]"}
          align={"end"}
        >
          <DropdownMenuItem onClick={onEdit}>
            <div className={"flex gap-3 items-center"}>
              <Edit size={14} className={"shrink-0"} />
              Edit Limit
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDetach}>
            <div className={"flex gap-3 items-center"}>
              <MinusCircleIcon size={14} className={"shrink-0"} />
              Detach
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NoLimitsInfo({
  onAddToken,
  onAddBudget,
}: {
  onAddToken: () => void;
  onAddBudget: () => void;
}) {
  return (
    <div>
      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          {"You haven't added any limits yet"}
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-md mt-1")}>
          Add token or budget caps that apply directly to this policy.
        </Paragraph>
      </div>
      <div className={"flex items-center justify-center gap-4 mt-5"}>
        <Button variant={"primary"} size={"xs"} onClick={onAddToken}>
          <IconCirclePlus size={14} />
          Add Token Limit
        </Button>
        <Button variant={"primary"} size={"xs"} onClick={onAddBudget}>
          <IconCirclePlus size={14} />
          Add Budget Limit
        </Button>
      </div>
    </div>
  );
}

function formatCap(value: number, isToken: boolean): string {
  if (!value) return "uncapped";
  if (isToken) return value.toLocaleString();
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// formatWindow renders a window duration in seconds as the most
// readable form: under 1h shows minutes, under 1d shows hours,
// everything else shows days (with a residual hours suffix when not
// a whole-day multiple).
function formatWindow(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  }
  if (seconds < 86_400) {
    const hours = Math.round(seconds / 3600);
    return `${hours}h`;
  }
  const days = Math.floor(seconds / 86_400);
  const remHours = Math.round((seconds % 86_400) / 3600);
  if (remHours === 0) return `${days}d`;
  return `${days}d ${remHours}h`;
}

function LimitEditModal({
  kind,
  limits,
  onSave,
  onClose,
}: {
  kind: LimitKind;
  limits: PolicyLimits;
  onSave: (next: PolicyLimits) => void;
  onClose: () => void;
}) {
  const isToken = kind === "token";
  const initial = isToken ? limits.tokenLimit : limits.budgetLimit;
  // Track inputs as strings so the user can clear the field; an empty
  // string is treated as 0 (= uncapped) on save.
  const initialGroup = isToken
    ? (initial as PolicyTokenLimit).groupCap
    : (initial as PolicyBudgetLimit).groupCapUsd;
  const initialUser = isToken
    ? (initial as PolicyTokenLimit).userCap
    : (initial as PolicyBudgetLimit).userCapUsd;
  const [groupCapStr, setGroupCapStr] = useState<string>(
    initialGroup > 0 ? String(initialGroup) : "",
  );
  const [userCapStr, setUserCapStr] = useState<string>(
    initialUser > 0 ? String(initialUser) : "",
  );
  // windowSeconds can be authored as minutes, hours, or days; the
  // unit selector below converts the input on save. Default to 30
  // days (2_592_000s) when the existing limit doesn't carry a value.
  const DEFAULT_WINDOW_SECONDS = 2_592_000;
  const initialWindowSeconds =
    initial.windowSeconds > 0 ? initial.windowSeconds : DEFAULT_WINDOW_SECONDS;
  const initialUnit: "m" | "h" | "d" = (() => {
    if (initialWindowSeconds % 86_400 === 0) return "d";
    if (initialWindowSeconds % 3600 === 0) return "h";
    return "m";
  })();
  const [windowUnit, setWindowUnit] = useState<"m" | "h" | "d">(initialUnit);
  const [windowAmountStr, setWindowAmountStr] = useState<string>(() => {
    if (initialUnit === "d") return String(Math.max(1, Math.floor(initialWindowSeconds / 86_400)));
    if (initialUnit === "h") return String(Math.max(1, Math.floor(initialWindowSeconds / 3600)));
    return String(Math.max(1, Math.floor(initialWindowSeconds / 60)));
  });

  const parseCap = (s: string): number => {
    const n = isToken ? parseInt(s, 10) : parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const groupCap = parseCap(groupCapStr);
  const userCap = parseCap(userCapStr);
  // windowSeconds is the wire value. Minimum 60 (one minute) per
  // backend validation; UI prevents save below that.
  const windowSeconds = (() => {
    const n = parseInt(windowAmountStr, 10);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (windowUnit === "d") return n * 86_400;
    if (windowUnit === "h") return n * 3600;
    return n * 60;
  })();

  const canSave = (groupCap > 0 || userCap > 0) && windowSeconds >= 60;

  const handleSave = () => {
    if (isToken) {
      onSave({
        ...limits,
        tokenLimit: { enabled: true, groupCap, userCap, windowSeconds },
      });
    } else {
      onSave({
        ...limits,
        budgetLimit: {
          enabled: true,
          groupCapUsd: groupCap,
          userCapUsd: userCap,
          windowSeconds,
        },
      });
    }
  };

  return (
    <Modal open={true} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <ModalContent maxWidthClass={"max-w-lg"} showClose={true}>
        <ModalHeader
          icon={isToken ? <Gauge size={19} /> : <Wallet size={19} />}
          title={isToken ? "Token Limit" : "Budget Limit"}
          description={
            isToken
              ? "Cap total tokens per group and per individual user over a rolling window."
              : "Cap USD spend per group and per individual user over a rolling window."
          }
          color={"netbird"}
        />
        <div className={"flex flex-col px-8 gap-4 pt-2 pb-6"}>
          <div className={"grid grid-cols-2 gap-4"}>
            <div>
              <Label>
                Group Cap
                <HelpTooltip
                  content={
                    <>
                      Caps the group&apos;s total consumption within the
                      window. Once reached, every member is blocked until the
                      window resets, regardless of individual usage.
                    </>
                  }
                />
              </Label>
              <HelpText>Group total within the window.</HelpText>
              <Input
                type={"number"}
                min={0}
                step={isToken ? "1" : "0.01"}
                placeholder={"0 = uncapped"}
                value={groupCapStr}
                onChange={(e) => setGroupCapStr(e.target.value)}
              />
            </div>
            <div>
              <Label>
                Individual Cap
                <HelpTooltip
                  content={
                    <>
                      Caps each member&apos;s own consumption within the
                      window. A user that hits this cap is blocked even when
                      the group still has headroom.
                    </>
                  }
                />
              </Label>
              <HelpText>Per-user limit within the window.</HelpText>
              <Input
                type={"number"}
                min={0}
                step={isToken ? "1" : "0.01"}
                placeholder={"0 = uncapped"}
                value={userCapStr}
                onChange={(e) => setUserCapStr(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Reset Window</Label>
            <HelpText>
              How often the cap counters reset. Minimum 1 minute.
            </HelpText>
            <div className={"flex gap-2"}>
              <Input
                type={"number"}
                min={1}
                className={"flex-1"}
                value={windowAmountStr}
                onChange={(e) => setWindowAmountStr(e.target.value)}
              />
              <select
                className={
                  "h-10 rounded-md border border-nb-gray-800 bg-nb-gray-940 px-3 text-sm text-nb-gray-100"
                }
                value={windowUnit}
                onChange={(e) =>
                  setWindowUnit(e.target.value as "m" | "h" | "d")
                }
              >
                <option value={"m"}>Minutes</option>
                <option value={"h"}>Hours</option>
                <option value={"d"}>Days</option>
              </select>
            </div>
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
            <Button
              variant={"primary"}
              disabled={!canSave}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
