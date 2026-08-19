import React from "react";
import { cn } from "@utils/helpers";
import {
  BotIcon,
  ChevronRightIcon,
  FolderGit2,
  Loader2,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ServerIcon,
  ShieldIcon,
  SquareDotIcon,
  SquareMinusIcon,
  SquarePlusIcon,
  TriangleAlertIcon,
  WaypointsIcon,
  WorkflowIcon,
} from "lucide-react";
import {
  ChangeKind,
  DraftChange,
} from "@/modules/control-center/draft/DraftChangesetContext";

// Shared presentation for a change across the Review & Deploy list and the
// detail pane — the entity icon, the verb-free title, and the kind badge.

// Entity icon — the verb lives in the badge.
export const changeIcon = (change: DraftChange, size = 14) => {
  switch (change.type) {
    case "create-group":
    case "update-group":
    case "delete-group":
      return <FolderGit2 size={size} />;
    case "create-policy":
    case "update-policy":
    case "delete-policy":
      return <ShieldIcon size={size} />;
    case "create-network":
    case "update-network":
    case "delete-network":
      return <NetworkIcon size={size} />;
    case "create-resource":
    case "update-resource":
    case "delete-resource":
      return <WorkflowIcon size={size} />;
    case "create-router":
    case "update-router":
      return <WaypointsIcon size={size} />;
    case "install-peer":
      // Match the placeholder's canvas icon by kind.
      return change.kind === "agent" ? (
        <BotIcon size={size} />
      ) : change.kind === "user-device" ? (
        <MonitorSmartphoneIcon size={size} />
      ) : (
        // Server glyph reads visually heavier than the others — nudge it down.
        <ServerIcon size={size - 2} />
      );
  }
};

// Entity title without the verb (the badge already says Create/Update/Delete).
export const entityTitle = (change: DraftChange): string => {
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
    case "update-network":
    case "delete-network":
      return `Network “${change.name}”`;
    case "create-resource":
    case "update-resource":
    case "delete-resource":
      return change.networkName
        ? `Resource “${change.name}” in “${change.networkName}”`
        : `Resource “${change.name}”`;
    case "create-router":
    case "update-router":
      return change.peerId
        ? `Routing peer “${change.peerName ?? change.peerId}” for “${change.networkName}”`
        : `Routing peer group “${change.groupName ?? change.groupId}” for “${change.networkName}”`;
    case "install-peer":
      if (change.installedPeerId) {
        return `Peer “${change.name}” is installed and joined your network`;
      }
      return change.kind === "user-device"
        ? `Peer “${change.name}”: select an existing peer or install a new one`
        : `Peer “${change.name}”: install it with a setup key to complete this draft`;
  }
};

// The entity's display name only (no verb, no type).
export const entityName = (change: DraftChange): string => {
  switch (change.type) {
    case "create-router":
    case "update-router":
      return (
        change.peerName ??
        change.groupName ??
        change.peerId ??
        change.groupId ??
        ""
      );
    default:
      return change.name;
  }
};

export const entityTypeLabel = (change: DraftChange): string => {
  switch (change.type) {
    case "create-group":
    case "update-group":
    case "delete-group":
      return "Group";
    case "create-policy":
    case "update-policy":
    case "delete-policy":
      return "Policy";
    case "create-network":
    case "update-network":
    case "delete-network":
      return "Network";
    case "create-resource":
    case "update-resource":
    case "delete-resource":
      return "Resource";
    case "create-router":
    case "update-router":
      return "Routing peer";
    case "install-peer":
      return "Peer";
  }
};

export const KIND_BADGES: Record<
  ChangeKind,
  { label: string; icon: React.ReactNode; className: string }
> = {
  add: {
    label: "Add",
    icon: <SquarePlusIcon size={13} />,
    className: "bg-green-900/30 text-green-400 border border-green-500/20",
  },
  update: {
    label: "Modify",
    icon: <SquareDotIcon size={13} />,
    className: "bg-yellow-900/30 text-yellow-400 border border-yellow-500/20",
  },
  remove: {
    label: "Delete",
    icon: <SquareMinusIcon size={13} />,
    className: "bg-red-900/30 text-red-400 border border-red-500/20",
  },
  // Not an API call — a step the USER performs (install / select the peer).
  // Deploy leaves these pending; amber signals action required.
  install: {
    label: "Install",
    icon: <TriangleAlertIcon size={13} />,
    className: "bg-amber-900/30 text-amber-400 border border-amber-500/20",
  },
};

// Just the kind icon in its color — no label, no background/border. Used in
// the compact nav rows.
const KIND_ICON_COLOR: Record<ChangeKind, string> = {
  add: "text-green-400",
  update: "text-yellow-400",
  remove: "text-red-400",
  install: "text-amber-400",
};

// The kind's file icon in its color — plus / diff / minus, no label.
export const KindIcon = ({
  kind,
  size = 15,
}: {
  kind: ChangeKind;
  size?: number;
}) => (
  <span className={cn("shrink-0 flex", KIND_ICON_COLOR[kind])}>
    {React.cloneElement(
      KIND_BADGES[kind].icon as React.ReactElement<{ size?: number }>,
      { size },
    )}
  </span>
);

// Blocking-issue badge (e.g. "No Network") — replaces the diffstat/kind badge
// on a change that can't deploy until it's fixed. Amber "action required",
// same palette as the "Install" action badge. When onClick is given the badge
// is the fix affordance (rendered as a role=button span, since it lives inside
// the accordion trigger button and can't nest a real <button>).
export const IssueBadge = ({
  label,
  onClick,
  waiting,
}: {
  label: string;
  onClick?: () => void;
  // "In progress" (peer waiting to register): spinner instead of the alert.
  waiting?: boolean;
}) => {
  const className = cn(
    "inline-flex items-center justify-center gap-1.5 text-[0.65rem] font-medium px-2 py-1 rounded shrink-0 [&>svg]:shrink-0",
    "bg-amber-900/30 text-amber-400 border border-amber-500/20",
    onClick &&
      "cursor-pointer hover:bg-amber-900/50 hover:text-amber-300 transition-colors",
  );
  const Leading = waiting ? (
    <Loader2 size={11} className={"animate-spin"} />
  ) : (
    <TriangleAlertIcon size={11} />
  );
  if (!onClick) {
    return (
      <span className={className}>
        {Leading}
        {label}
      </span>
    );
  }
  return (
    <span
      role={"button"}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          onClick();
        }
      }}
      className={className}
    >
      {Leading}
      {label}
      {/* Chevron hints the badge is clickable (opens the fix). */}
      <ChevronRightIcon size={12} className={"-mr-0.5 opacity-70"} />
    </span>
  );
};

export const KindBadge = ({ kind }: { kind: ChangeKind }) => {
  const badge = KIND_BADGES[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 text-[0.65rem] font-medium px-2 py-1 rounded shrink-0 [&>svg]:shrink-0",
        badge.className,
      )}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
};

// GitHub-style diffstat: "+N -M" plus a 5-square proportion bar. Shown in the
// accordion header when the review is in Code mode.
export const DiffStat = ({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) => {
  const total = additions + deletions;
  let green: number;
  let red: number;
  if (total <= 5) {
    green = additions;
    red = deletions;
  } else {
    green =
      additions === 0 ? 0 : Math.max(1, Math.round((additions / total) * 5));
    red =
      deletions === 0 ? 0 : Math.max(1, Math.round((deletions / total) * 5));
    while (green + red > 5) {
      if (green >= red) green--;
      else red--;
    }
  }
  const gray = Math.max(0, 5 - green - red);
  const blocks = [
    ...Array(green).fill("bg-green-500"),
    ...Array(red).fill("bg-red-500"),
    ...Array(gray).fill("bg-nb-gray-800"),
  ];

  return (
    <span className={"flex items-center gap-2 shrink-0"}>
      {additions > 0 && (
        <span className={"text-[0.7rem] font-medium text-green-400"}>
          +{additions}
        </span>
      )}
      {deletions > 0 && (
        <span className={"text-[0.7rem] font-medium text-red-400"}>
          −{deletions}
        </span>
      )}
      <span className={"flex items-center gap-[2px]"}>
        {blocks.map((c, i) => (
          <span key={i} className={cn("w-2 h-2 rounded-[1px]", c)} />
        ))}
      </span>
    </span>
  );
};
