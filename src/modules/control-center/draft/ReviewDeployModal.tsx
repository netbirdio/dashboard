import React, { useMemo } from "react";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { ScrollArea } from "@components/ScrollArea";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import {
  CloudUploadIcon,
  ExternalLinkIcon,
  FolderGit2,
  GitPullRequestArrowIcon,
  ListChecksIcon,
  ShieldIcon,
  SquareMinusIcon,
  SquarePenIcon,
  SquarePlusIcon,
  GlobeIcon,
  NetworkIcon,
  TriangleAlertIcon,
  WaypointsIcon,
  XIcon,
} from "lucide-react";
import { Group } from "@/interfaces/Group";
import {
  ChangeKind,
  DraftChange,
  getChangeKind,
  getDraftWarnings,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDeployChangeset } from "@/modules/control-center/hooks/useDeployChangeset";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after every change was applied successfully.
  onDeployed: () => void;
};

// Entity icon — the verb lives in the badge.
const changeIcon = (change: DraftChange) => {
  switch (change.type) {
    case "create-group":
    case "update-group":
    case "delete-group":
      return <FolderGit2 size={14} />;
    case "create-policy":
    case "update-policy":
    case "delete-policy":
      return <ShieldIcon size={14} />;
    case "create-network":
      return <NetworkIcon size={14} />;
    case "create-resource":
      return <GlobeIcon size={14} />;
    case "create-router":
      return <WaypointsIcon size={14} />;
  }
};

// Entity title without the verb (the badge already says Create/Update/Delete).
const entityTitle = (change: DraftChange) => {
  switch (change.type) {
    case "create-group":
    case "update-group":
    case "delete-group":
      return `Group “${change.name}”`;
    case "create-policy":
    case "update-policy":
    case "delete-policy":
      return `Policy “${change.name}”`;
    case "create-network":
      return `Network “${change.name}”`;
    case "create-resource":
      return `Resource “${change.name}” in “${change.networkName}”`;
    case "create-router":
      return change.peerId
        ? `Routing peer “${change.peerName ?? change.peerId}” for “${change.networkName}”`
        : `Routing peer group “${change.groupName ?? change.groupId}” for “${change.networkName}”`;
  }
};

// Action badge at the start of each card: icon + label.
const KIND_BADGES: Record<
  ChangeKind,
  { label: string; icon: React.ReactNode; className: string }
> = {
  add: {
    label: "Create",
    icon: <SquarePlusIcon size={11} />,
    className: "bg-green-900/30 text-green-400 border-green-500/20",
  },
  update: {
    label: "Update",
    icon: <SquarePenIcon size={11} />,
    className: "bg-orange-900/30 text-orange-400 border-orange-500/20",
  },
  remove: {
    label: "Delete",
    icon: <SquareMinusIcon size={11} />,
    className: "bg-red-900/30 text-red-400 border-red-500/20",
  },
};

const ChangeRow = ({
  change,
  onDiscard,
  disabled,
}: {
  change: DraftChange;
  onDiscard: () => void;
  disabled: boolean;
}) => {
  const badge = KIND_BADGES[getChangeKind(change)];
  return (
    <div
      className={
        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-nb-gray-930/80 transition-colors"
      }
    >
      <span
        className={cn(
          "w-[64px] flex items-center justify-center gap-1 text-[0.65rem] leading-none font-medium px-1.5 py-1 rounded border shrink-0",
          badge.className,
        )}
      >
        {badge.icon}
        {badge.label}
      </span>
      <span className={"text-nb-gray-200 shrink-0"}>{changeIcon(change)}</span>
      <span className={"text-xs text-nb-gray-200 truncate min-w-0 flex-1"}>
        {entityTitle(change)}
      </span>
      <button
        onClick={onDiscard}
        disabled={disabled}
        className={
          "p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-all shrink-0"
        }
        aria-label={"Discard change"}
      >
        <XIcon size={13} />
      </button>
    </div>
  );
};

export const ReviewDeployModal = ({ open, onOpenChange, onDeployed }: Props) => {
  const { changes, removeChange } = useDraftChangeset();
  const { deploy, isDeploying } = useDeployChangeset();

  const count = changes.length;
  const warnings = useMemo(() => getDraftWarnings(changes), [changes]);

  // Policies that reference draft-created groups become parents: every group
  // creation the policy requires nests under it. A group required by several
  // policies is shown once, under the first one.
  const rows = useMemo(() => {
    const createGroupByName = new Map<string, DraftChange>();
    changes.forEach((c) => {
      if (c.type === "create-group") createGroupByName.set(c.name, c);
    });

    const requiredGroups = (change: DraftChange): DraftChange[] => {
      if (change.type !== "create-policy" && change.type !== "update-policy")
        return [];
      const rule = change.policy.rules?.[0];
      const referenced = [
        ...(((rule?.sources as (Group | string)[]) ?? []) || []),
        ...(((rule?.destinations as (Group | string)[]) ?? []) || []),
      ];
      const deps: DraftChange[] = [];
      referenced.forEach((g) => {
        if (typeof g === "string" || g.id) return;
        const dep = createGroupByName.get(g.name);
        if (dep && !deps.includes(dep)) deps.push(dep);
      });
      return deps;
    };

    // Attach each required group to the first policy that references it.
    const claimed = new Set<string>();
    const childrenByPolicy = new Map<string, DraftChange[]>();
    changes.forEach((c) => {
      const deps = requiredGroups(c).filter((d) => !claimed.has(d.id));
      if (deps.length === 0) return;
      deps.forEach((d) => claimed.add(d.id));
      childrenByPolicy.set(c.id, deps);
    });

    return changes
      .filter((c) => !claimed.has(c.id))
      .map((c) => ({
        change: c,
        children: childrenByPolicy.get(c.id) ?? [],
      }));
  }, [changes]);

  const description = useMemo(
    () => (
      <span className={"text-xs"}>
        {count} change{count !== 1 ? "s" : ""} will be applied to your network.
      </span>
    ),
    [count],
  );

  const handleDeploy = async () => {
    const ok = await deploy();
    onOpenChange(false);
    if (ok) onDeployed();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<GitPullRequestArrowIcon size={18} className={"text-netbird"} />}
          title={"Review & Deploy"}
          description={description}
        />
        <div className={"px-8 pt-2 pb-8"}>
          {/* Non-blocking warnings — deploying is still allowed (mirrors the
              live "no access control policies" confirmation). */}
          {warnings.length > 0 && (
            <div
              className={
                "rounded-md border border-amber-500/25 bg-amber-900/20 px-3.5 py-2.5 mb-3 flex flex-col gap-1.5"
              }
            >
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className={"flex items-start gap-2 text-xs text-amber-300"}
                >
                  <TriangleAlertIcon
                    size={13}
                    className={"shrink-0 mt-[1px]"}
                  />
                  {warning}
                </div>
              ))}
            </div>
          )}
          <div
            className={
              "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 overflow-hidden"
            }
          >
            <div
              className={
                "flex items-center gap-2 px-3.5 py-2.5 border-b border-nb-gray-910 text-xs font-medium text-nb-gray-200"
              }
            >
              <ListChecksIcon size={14} className={"text-nb-gray-300"} />
              Changes
            </div>
            <ScrollArea className={"max-h-[340px]"}>
              {/* w-0 min-w-full defeats the viewport's table sizing so long
                  titles truncate instead of widening the modal. */}
              <div className={"p-1.5 w-0 min-w-full"}>
              {rows.map(({ change, children }) => (
                // Related changes cluster as a tight block (required groups
                // first, their policy last — deploy order); the larger gap
                // between blocks conveys what belongs together.
                <div key={change.id} className={"mb-2 last:mb-0"}>
                  {children.map((child) => (
                    <ChangeRow
                      key={child.id}
                      change={child}
                      onDiscard={() => removeChange(child.id)}
                      disabled={isDeploying}
                    />
                  ))}
                  <ChangeRow
                    change={change}
                    onDiscard={() => removeChange(change.id)}
                    disabled={isDeploying}
                  />
                </div>
              ))}
              {count === 0 && (
                <div className={"text-sm text-nb-gray-400 text-center py-8"}>
                  No pending changes.
                </div>
              )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                // TODO: point at the Control Center / changeset docs page
                // once it exists.
                href={"https://docs.netbird.io/"}
                target={"_blank"}
              >
                Changesets
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} disabled={isDeploying}>
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant={"primary"}
              disabled={count === 0 || isDeploying}
              onClick={handleDeploy}
            >
              <CloudUploadIcon size={16} />
              {isDeploying ? "Deploying..." : "Deploy"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
