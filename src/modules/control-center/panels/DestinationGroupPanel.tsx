import { cn } from "@utils/helpers";
import {
  DownloadIcon,
  Layers3Icon,
  Loader2,
  MonitorSmartphoneIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSWRConfig } from "swr";
import { type Edge, useReactFlow } from "@xyflow/react";
import { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { useDialog } from "@/contexts/DialogProvider";
import Button from "@components/Button";
import {
  MemoizedScrollArea,
  ScrollAreaViewport,
} from "@components/ScrollArea";
import { Virtuoso } from "react-virtuoso";
import { Checkbox } from "@components/Checkbox";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  getGroupPeers,
  getGroupResources,
} from "@/modules/control-center/utils/graph-builder";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  getIpPlaceholderFromRange,
  getPlaceholderPeer,
  pinByOrder,
  useStructuralNodes,
} from "@/modules/control-center/utils/helpers";
import { useAccount } from "@/modules/account/useAccount";
import { SmallBadge } from "@components/ui/SmallBadge";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import {
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";

interface DestinationGroupPanelProps {
  // Real group id, or — for draft groups without an API id — the canvas node id.
  groupId: string;
  onClose: () => void;
}

export const MIN_PANEL_WIDTH = 398;

// Bridges Virtuoso's scroll container into the styled ScrollArea viewport
// (same pattern as the components panel / PeerSelector).
export const PanelVirtuosoScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <ScrollAreaViewport ref={ref} {...props} />);
PanelVirtuosoScroller.displayName = "PanelVirtuosoScroller";


// Close guard: while the panel holds unassigned toggles it registers a
// confirm function here. External close paths (the canvas pane click in
// page.tsx) must consult it before clearing the selection — resolves true
// when closing is OK (nothing pending, or the user chose Discard).
export const groupPanelCloseGuard: {
  current: null | (() => Promise<boolean>);
} = { current: null };

// The panel's left edge lines up with the Cancel button of the header action
// row above it (Cancel · Review & Deploy · Live/Draft — both are right-6
// anchored), so the width tracks that row live: it grows with the
// change-count badge and shrinks back to the Live/Draft tabs outside draft.
export function usePanelWidth() {
  const [width, setWidth] = useState(MIN_PANEL_WIDTH);
  useEffect(() => {
    const el = document.getElementById("cc-header-actions");
    if (!el) return;
    const update = () =>
      setWidth(Math.max(MIN_PANEL_WIDTH, Math.round(el.offsetWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return width;
}

// Same row treatment as the components panel's PanelListItem; in draft it
// carries a PeerGroupSelector-style membership checkbox.
export const MemberRow = ({
  children,
  checked,
  onToggle,
}: React.PropsWithChildren<{
  checked?: boolean;
  // Absent = read-only row (live mode / "All" group): no checkbox, no hover.
  onToggle?: () => void;
}>) => (
  <div
    onClick={onToggle}
    className={cn(
      "flex items-center h-[52px] rounded-md px-1 transition-colors",
      // Row hover, EXCEPT while an inline action (the "Not installed" /
      // "No Network" chip) is hovered — the chip is its own click target.
      onToggle &&
        "hover:bg-nb-gray-900/50 [&:has(.cc-row-action:hover)]:bg-transparent cursor-pointer",
    )}
  >
    <div className={"flex items-center flex-1 min-w-0"}>{children}</div>
    {onToggle && (
      <div className={"shrink-0 ml-auto mr-3"}>
        <Checkbox checked={!!checked} />
      </div>
    )}
  </div>
);

// Alert control on draft rows ("Not installed" / "No Network") — the exact
// treatment of a standalone resource's floating "No Network" button. A CTA
// when a flow resolves the state.
const DraftStatusChip = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) => (
  <Button
    variant={"secondary"}
    size={"xs"}
    className={cn(
      "cc-row-action shrink-0 ml-2 mr-4 !px-2.5 !text-nb-gray-300",
      !onClick && "cursor-default",
    )}
    onClick={(e) => {
      // Don't toggle the row's checkbox.
      e.stopPropagation();
      onClick?.();
    }}
  >
    {icon ?? <TriangleAlertIcon size={12} className={"text-yellow-400"} />}
    {label}
  </Button>
);

// Draft peer row action: user devices open the setup stepper ("Setup
// Device"), servers/agents the install modal ("Install").
const DraftPeerRowActions = ({ draftPeer }: { draftPeer: Peer }) => {
  const { setInstallModal, setUserDeviceModal } = useDraftMode();
  const isUserDevice = draftPeer.os === "draft-user-device";
  const kind = (draftPeer.os?.replace("draft-", "") ??
    "server") as PeerPlaceholderKind;
  const nodeId = `peer-${draftPeer.id}`;
  const setupKey = (draftPeer as Peer & { setupKey?: string }).setupKey;

  return (
    <DraftStatusChip
      label={isUserDevice ? "Install or assign" : setupKey ? "Waiting" : "Install"}
      icon={
        isUserDevice ? undefined : setupKey ? (
          <Loader2 size={12} className={"animate-spin text-nb-gray-300"} />
        ) : (
          <DownloadIcon size={12} className={"text-yellow-400"} />
        )
      }
      onClick={() =>
        isUserDevice
          ? setUserDeviceModal({ nodeId, name: draftPeer.name ?? "Device" })
          : setInstallModal({
              isUserDevice: false,
              setupKey,
              placeholderKind: kind,
              nodeId,
            })
      }
    />
  );
};

export const DestinationGroupPanel = ({
  groupId,
  onClose,
}: DestinationGroupPanelProps) => {
  const { peers, networkResources, groups } = useControlCenterData();
  // Structural subscription — the panel derives from node data only, and a
  // context nodes subscription re-rendered it (and its member lists) on
  // every canvas update while open.
  const nodes = useStructuralNodes();
  const { setNodes, setEdges } = useCanvasState();
  const { isDraft, setResourceNetworkPicker } = useDraftMode();
  const { changes } = useDraftChangeset();
  const { removeGroupMember } = useDraftGroupActions();
  const { addMemberToGroup } = useDragToGroup();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const groupRequest = useApiCall<Group>("/groups", true);
  const panelWidth = usePanelWidth();
  const reactFlow = useReactFlow();
  const account = useAccount();

  // In draft the canvas node is the source of truth (it carries renames and
  // drag-added members); the API group is the live-mode fallback. A group can
  // exist on the canvas more than once (source node + destination copy).
  // A framed "resource group" (resourceGroupNode) is a group too — include it
  // so its panel resolves members, even though it's kept out of the shared
  // isGroupNode set (which routes menus/removal for the plain group nodes).
  const isPanelGroupNode = (n: (typeof nodes)[number]) =>
    isGroupNode(n) || n.type === "resourceGroupNode";
  const groupNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          isPanelGroupNode(n) &&
          (n.id === groupId || getNodeGroup(n)?.id === groupId),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, groupId],
  );
  const groupNode = groupNodes[0];

  const group: Group | undefined = useMemo(() => {
    if (isDraft && groupNode) return getNodeGroup(groupNode);
    return groups?.find((g) => g.id === groupId) ?? getNodeGroup(groupNode);
  }, [isDraft, groupNode, groups, groupId]);

  // Open on the Resources tab when the group leans towards resources: a framed
  // resource group, or any group that holds more resources than peers.
  const preferResourcesTab =
    groupNode?.type === "resourceGroupNode" ||
    !!groupNode?.parentId?.startsWith("network-") ||
    (group?.resources_count ?? 0) > (group?.peers_count ?? 0);

  const realGroupId = group?.id ?? "";

  // Draft membership edits live on the canvas nodes AND in the changeset. The
  // changeset is authoritative: node data (addedMembers/removedMembers Sets) is
  // transient — a canvas rebuild or an SWR mutate of /peers|/networks/resources
  // drops it, which would resurrect a removed member even though the changeset
  // still records the removal. Folding the changeset in makes the displayed
  // membership survive both. Matches PeerGroupsPanel's derivation.
  const addedMembers = useMemo(() => {
    const added = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.addedMembers as Set<string> | undefined;
      members?.forEach((id) => added.add(id));
    });
    if (isDraft) {
      changes.forEach((c) => {
        const matches =
          (c.type === "create-group" && c.name === group?.name) ||
          (c.type === "update-group" && c.groupId === realGroupId);
        if (c.type === "create-group" && matches) {
          c.peerIds.forEach((id) => added.add(id));
          c.resourceIds.forEach((id) => added.add(id));
        } else if (c.type === "update-group" && matches) {
          c.peerIds.forEach((id) => added.add(id));
          c.resourceIds.forEach((id) => added.add(id));
        }
      });
    }
    return added;
  }, [groupNodes, isDraft, changes, group?.name, realGroupId]);
  const removedMembers = useMemo(() => {
    const removed = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.removedMembers as Set<string> | undefined;
      members?.forEach((id) => removed.add(id));
    });
    if (isDraft) {
      changes.forEach((c) => {
        if (c.type === "update-group" && c.groupId === realGroupId) {
          c.removedPeerIds?.forEach((id) => removed.add(id));
          c.removedResourceIds?.forEach((id) => removed.add(id));
        }
      });
    }
    return removed;
  }, [groupNodes, isDraft, changes, realGroupId]);

  // Draft members (placeholder peers, draft resources) aren't in the API
  // lists — their objects ride on the group node, stored at drop time.
  const draftMemberPeers = useMemo(() => {
    const byId = new Map<string, Peer>();
    groupNodes.forEach((n) => {
      (n.data?.draftPeers as Peer[] | undefined)?.forEach((p) => {
        if (p.id && addedMembers.has(p.id)) byId.set(p.id, p);
      });
    });
    return [...byId.values()];
  }, [groupNodes, addedMembers]);
  const draftMemberResources = useMemo(() => {
    const byId = new Map<string, NetworkResource>();
    groupNodes.forEach((n) => {
      (n.data?.draftResources as NetworkResource[] | undefined)?.forEach(
        (r) => {
          if (r.id && addedMembers.has(r.id)) byId.set(r.id, r);
        },
      );
    });
    return [...byId.values()];
  }, [groupNodes, addedMembers]);

  // Placeholder peers still ON the canvas are assignable from the panel too
  // (checking one absorbs its node, exactly like dropping it on the group).
  const canvasPlaceholderPeers = useMemo(() => {
    const byId = new Map<string, { peer: Peer; nodeId: string }>();
    nodes.forEach((n) => {
      const p = getPlaceholderPeer(n);
      if (p?.id) byId.set(p.id, { peer: p, nodeId: n.id });
    });
    return byId;
  }, [nodes]);

  const groupPeers = useMemo(() => {
    const existing =
      peers && realGroupId ? getGroupPeers(peers, realGroupId) : [];
    const addedPeers = (peers ?? []).filter(
      (p) =>
        p.id && addedMembers.has(p.id) && !existing.some((e) => e.id === p.id),
    );
    return [...existing, ...addedPeers, ...draftMemberPeers].filter(
      (p) => !removedMembers.has(p.id ?? ""),
    );
  }, [peers, realGroupId, addedMembers, removedMembers, draftMemberPeers]);

  const resources = useMemo(() => {
    const existing =
      networkResources && realGroupId
        ? getGroupResources(networkResources, realGroupId)
        : [];
    const addedResources = (networkResources ?? []).filter(
      (r) => addedMembers.has(r.id) && !existing.some((e) => e.id === r.id),
    );
    return [...existing, ...addedResources, ...draftMemberResources].filter(
      (r) => !removedMembers.has(r.id),
    );
  }, [
    networkResources,
    realGroupId,
    addedMembers,
    removedMembers,
    draftMemberResources,
  ]);

  // ---- Membership editing ("All" membership is automatic) ----
  // Checking/unchecking only edits a LOCAL selection (the node's count text
  // previews it, debounced). Confirm applies the diff in one go: draft →
  // canvas + changeset; live → a real PUT behind a "you are in live mode"
  // confirmation.

  const canEditMembers =
    !isAllGroup(group) && (isDraft ? !!groupNode : !!realGroupId);
  const memberPeerIds = useMemo(
    () => new Set(groupPeers.map((p) => p.id ?? "")),
    [groupPeers],
  );
  const memberResourceIds = useMemo(
    () => new Set(resources.map((r) => r.id)),
    [resources],
  );

  const [selectedPeerIds, setSelectedPeerIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(
    new Set(),
  );
  // Sync the live selection from the actual membership — on open/group
  // switch and after a save. Keyed by CONTENT, not set identity: canvas node
  // updates rebuild the sets every time and identity-based deps wiped the
  // in-progress selection.
  const memberPeersKey = useMemo(
    () => [...memberPeerIds].sort().join(","),
    [memberPeerIds],
  );
  const memberResourcesKey = useMemo(
    () => [...memberResourceIds].sort().join(","),
    [memberResourceIds],
  );
  useEffect(() => {
    setSelectedPeerIds(
      new Set(memberPeersKey ? memberPeersKey.split(",") : []),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, memberPeersKey]);
  useEffect(() => {
    setSelectedResourceIds(
      new Set(memberResourcesKey ? memberResourcesKey.split(",") : []),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, memberResourcesKey]);

  const setEquals = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((id) => b.has(id));
  const dirty =
    !setEquals(selectedPeerIds, memberPeerIds) ||
    !setEquals(selectedResourceIds, memberResourceIds);

  const toggleId = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  // Toggles only edit the LOCAL selection — Save applies everything at once
  // (draft: one coalesced changeset entry; live: one PUT). The canvas preview is
  // driven imperatively from HERE, not a selection effect: an effect can't tell a
  // real toggle from the still-populating-on-open transient, which flashed a
  // stale count onto the node.
  const togglePeer = (peer: Peer) => {
    if (!peer.id) return;
    const next = toggleId(selectedPeerIds, peer.id);
    setSelectedPeerIds(next);
    syncNodeCounts(next.size, selectedResourceIds.size);
  };
  const toggleResource = (resource: NetworkResource) => {
    const next = toggleId(selectedResourceIds, resource.id);
    setSelectedResourceIds(next);
    syncNodeCounts(selectedPeerIds.size, next.size);
    syncGroupEdges(next);
  };

  // Live count preview while toggling (debounced below) writes the pending
  // selection sizes into every canvas instance of the group so its subtitle
  // ("No Peers, 2 Resources") follows the checkboxes.
  const syncNodeCounts = useCallback(
    (peersCount: number, resourcesCount: number) => {
      if (!group) return;
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          const g = getNodeGroup(n);
          if (!g) return n;
          const sameGroup = group.id
            ? g.id === group.id
            : !g.id && g.name === group.name;
          if (!sameGroup) return n;
          if (
            (g.peers_count || 0) === peersCount &&
            (g.resources_count || 0) === resourcesCount
          ) {
            return n;
          }
          changed = true;
          return {
            ...n,
            data: {
              ...n.data,
              group: {
                ...g,
                peers_count: peersCount,
                resources_count: resourcesCount,
              },
            },
          };
        });
        return changed ? next : prev;
      });
    },
    [group, setNodes],
  );

  // Live preview of the group↔resource connections while toggling — only in the
  // drilled view, where resources are standalone nodes (`!parentId`); a framed
  // row attaches differently. Reverted on close unless saved.
  const syncGroupEdges = useCallback(
    (resourceIds: Set<string>) => {
      const gid = group?.id;
      if (!gid) return;
      const groupNodeId = `group-${gid}`;
      setEdges((prev) => {
        const nodeById = new Map(reactFlow.getNodes().map((n) => [n.id, n]));
        const wanted = new Set<string>();
        resourceIds.forEach((rid) => {
          const n = nodeById.get(`resource-${rid}`);
          if (n && !n.parentId) wanted.add(`${groupNodeId}-resource-${rid}`);
        });
        const isGroupResEdge = (e: Edge) =>
          e.source === groupNodeId && (e.target ?? "").startsWith("resource-");
        let changed = false;
        const kept = prev.filter((e) => {
          if (!isGroupResEdge(e)) return true;
          const keep = wanted.has(e.id);
          if (!keep) changed = true;
          return keep;
        });
        const have = new Set(kept.map((e) => e.id));
        const added: Edge[] = [];
        wanted.forEach((id) => {
          if (have.has(id)) return;
          const rid = id.slice(`${groupNodeId}-resource-`.length);
          added.push({
            id,
            source: groupNodeId,
            sourceHandle: "sr",
            target: `resource-${rid}`,
            type: "simple",
            data: {},
          });
          changed = true;
        });
        return changed ? [...kept, ...added] : prev;
      });
    },
    [group, setEdges, reactFlow],
  );

  // Closing / switching groups with unsaved toggles reverts the previewed
  // counts to the actual membership. The ref updates AFTER effects run, so
  // at cleanup time it still snapshots the previous group.
  const restoreCountsRef = useRef<{
    sync: (p: number, r: number) => void;
    peers: number;
    resources: number;
  } | null>(null);
  useEffect(() => {
    restoreCountsRef.current = {
      sync: syncNodeCounts,
      peers: memberPeerIds.size,
      resources: memberResourceIds.size,
    };
  }, [syncNodeCounts, memberPeerIds, memberResourceIds]);
  useEffect(() => {
    if (!groupId) return;
    return () => {
      const r = restoreCountsRef.current;
      r?.sync(r.peers, r.resources);
    };
  }, [groupId]);

  // Revert the previewed connections on close unless saved. The refs are updated
  // in an effect, NOT inline during render, so that on the closing render (where
  // `group` is already undefined) the [groupId] cleanup below still sees the
  // leaving group's syncer + membership — effect updates run after cleanups.
  const savedRef = useRef(false);
  const syncGroupEdgesRef = useRef(syncGroupEdges);
  const memberResourceIdsRef = useRef(memberResourceIds);
  useEffect(() => {
    syncGroupEdgesRef.current = syncGroupEdges;
    memberResourceIdsRef.current = memberResourceIds;
  }, [syncGroupEdges, memberResourceIds]);
  useEffect(() => {
    if (!groupId) return;
    savedRef.current = false;
    return () => {
      if (!savedRef.current) {
        syncGroupEdgesRef.current(memberResourceIdsRef.current);
      }
    };
  }, [groupId]);

  const [saving, setSaving] = useState(false);

  const saveMembership = async () => {
    if (!group) return;
    if (isDraft) {
      if (!groupNode) return;
      // The debounced preview already wrote the selection counts to the
      // nodes — reset to the actual membership first so the add/remove
      // increments below land on the right baseline. All adds/removes
      // coalesce into ONE update-group changeset entry.
      syncNodeCounts(memberPeerIds.size, memberResourceIds.size);
      (peers ?? []).forEach((p) => {
        if (!p.id) return;
        if (selectedPeerIds.has(p.id) && !memberPeerIds.has(p.id)) {
          addMemberToGroup(groupNode, { peer: p });
        } else if (!selectedPeerIds.has(p.id) && memberPeerIds.has(p.id)) {
          removeGroupMember(group, { peerId: p.id });
        }
      });
      (networkResources ?? []).forEach((r) => {
        if (selectedResourceIds.has(r.id) && !memberResourceIds.has(r.id)) {
          addMemberToGroup(groupNode, { resource: r });
        } else if (
          !selectedResourceIds.has(r.id) &&
          memberResourceIds.has(r.id)
        ) {
          removeGroupMember(group, { resourceId: r.id });
        }
      });
      // Draft members only appear as rows while they ARE members — the only
      // possible edit is unassigning them.
      draftMemberPeers.forEach((p) => {
        if (p.id && !selectedPeerIds.has(p.id)) {
          removeGroupMember(group, { peerId: p.id });
        }
      });
      draftMemberResources.forEach((r) => {
        if (!selectedResourceIds.has(r.id)) {
          removeGroupMember(group, { resourceId: r.id });
        }
      });
      // Checked canvas placeholders join the group — their node is absorbed,
      // exactly like a drop.
      canvasPlaceholderPeers.forEach(({ peer, nodeId }, id) => {
        if (selectedPeerIds.has(id) && !memberPeerIds.has(id)) {
          addMemberToGroup(groupNode, { peer, draggedNodeId: nodeId });
        }
      });
      // Applying closes the panel. The unmount cleanup restores the counts
      // snapshot — point it at the just-applied selection so it doesn't
      // revert the apply.
      restoreCountsRef.current = {
        sync: syncNodeCounts,
        peers: selectedPeerIds.size,
        resources: selectedResourceIds.size,
      };
      savedRef.current = true;
      onClose();
      return;
    }

    // Live — the PUT hits the account immediately, so confirm first.
    if (!group.id) return;
    const choice = await confirm({
      title: `Save group “${group.name}”?`,
      description:
        "You are in live mode. Saving your changes will apply them to your account immediately.",
      confirmText: "Save",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;
    setSaving(true);
    // The group PUT wants peers as id strings but resources as {id, type}
    // objects. Sending resource id strings makes the API reject the body
    // ("could not parse json"). Mirror the networks/groups pages.
    const request = groupRequest
      .put(
        {
          name: group.name,
          peers: [...selectedPeerIds],
          resources: [...selectedResourceIds].map((id) => ({
            id,
            type: networkResources?.find((r) => r.id === id)?.type,
          })),
        },
        `/${group.id}`,
      )
      .then(async (g) => {
        // Membership shows on /groups, /peers (peer.groups) and
        // /networks/resources (resource.groups). /policies embeds group member
        // counts too, and the views rebuild their group nodes from it — refresh
        // all four so the panel un-dirties AND other views/draft don't show
        // stale counts.
        await Promise.all([
          mutate("/groups"),
          mutate("/peers"),
          mutate("/networks/resources"),
          mutate("/policies"),
        ]);
        return g;
      });
    // The promise drives the toast: green on success, red with the API error
    // on failure (useApiCall runs with ignoreError=true and rejects, so a
    // plain notify would have shown a green "success" for a failed save).
    notify({
      title: group.name,
      description: `${group.name} was successfully saved.`,
      promise: request,
    });
    try {
      await request;
      // The toggles already previewed the new membership onto the canvas, so
      // DON'T rebuild the view (that refit + auto-arranged it on every save) —
      // just keep the preview: mark saved so close doesn't revert the edges, and
      // point the count-restore snapshot at the applied selection.
      savedRef.current = true;
      restoreCountsRef.current = {
        sync: syncNodeCounts,
        peers: selectedPeerIds.size,
        resources: selectedResourceIds.size,
      };
      // Close the panel (draft's Assign path closes too).
      onClose();
    } catch {
      // Re-sync so the optimistic canvas counts revert to the server truth.
      await Promise.all([
        mutate("/groups"),
        mutate("/peers"),
        mutate("/networks/resources"),
        mutate("/policies"),
      ]).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState("peers");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch("");
    // Resource-leaning groups open on the Resources tab; everything else Peers.
    setTab(preferResourcesTab ? "resources" : "peers");
    // autoFocus only fires on mount — refocus when switching groups too.
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const query = search.trim().toLowerCase();

  // Draft: EVERY peer/resource is listed (members first, checked) so the
  // checkbox doubles as assign/unassign, the same pattern as PeerGroupSelector.
  // Live: members only. The members-first order here is only a SEED. It's
  // pinned below to the sequence captured when the panel opened.
  const peerCandidates = useMemo(() => {
    if (!canEditMembers) return groupPeers;
    return [
      // Draft members (placeholder peers) aren't in the API list, so they lead
      // the member section so the row count matches the group's counter.
      ...draftMemberPeers,
      ...(peers ?? []).filter((p) => p.id && memberPeerIds.has(p.id)),
      // Canvas placeholders not yet in the group are assignable.
      ...[...canvasPlaceholderPeers.values()]
        .map(({ peer }) => peer)
        .filter((p) => p.id && !addedMembers.has(p.id)),
      ...(peers ?? []).filter((p) => p.id && !memberPeerIds.has(p.id)),
    ];
  }, [
    canEditMembers,
    groupPeers,
    peers,
    memberPeerIds,
    draftMemberPeers,
    canvasPlaceholderPeers,
    addedMembers,
  ]);

  const resourceCandidates = useMemo(() => {
    if (!canEditMembers) return resources;
    return [
      ...draftMemberResources,
      ...(networkResources ?? []).filter((r) => memberResourceIds.has(r.id)),
      ...(networkResources ?? []).filter((r) => !memberResourceIds.has(r.id)),
    ];
  }, [
    canEditMembers,
    resources,
    networkResources,
    memberResourceIds,
    draftMemberResources,
  ]);

  // Row order FROZEN per open: the full ordered id sequence, captured once the
  // data is ready. Toggling, saving, and the post-save SWR mutate (which can
  // return the peers/resources arrays in a different order) all leave the rows
  // where they were; ids that appear after open sort to the end. Null until
  // the data is loaded.
  const [rowOrder, setRowOrder] = useState<{
    peers: string[];
    resources: string[];
  } | null>(null);
  useEffect(() => {
    setRowOrder(null);
  }, [groupId]);
  useEffect(() => {
    if (rowOrder || !groupId || !peers || !networkResources) return;
    setRowOrder({
      peers: peerCandidates.map((p) => p.id ?? "").filter(Boolean),
      resources: resourceCandidates.map((r) => r.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowOrder, groupId, peers, networkResources]);

  const peerRows = useMemo(() => {
    const pinned = rowOrder
      ? pinByOrder(peerCandidates, rowOrder.peers, (p) => p.id ?? "")
      : peerCandidates;
    if (!query) return pinned;
    return pinned.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.ip?.toLowerCase().includes(query) ||
        p.dns_label?.toLowerCase().includes(query),
    );
  }, [peerCandidates, rowOrder, query]);

  const resourceRows = useMemo(() => {
    const pinned = rowOrder
      ? pinByOrder(resourceCandidates, rowOrder.resources, (r) => r.id)
      : resourceCandidates;
    if (!query) return pinned;
    return pinned.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query),
    );
  }, [resourceCandidates, rowOrder, query]);

  // Footer count — total assignable entities per tab.
  const totalPeers =
    (peers ?? []).filter((p) => p.id).length +
    draftMemberPeers.length +
    [...canvasPlaceholderPeers.keys()].filter((id) => !addedMembers.has(id))
      .length;
  const totalResources =
    (networkResources ?? []).length + draftMemberResources.length;

  // ---- Placement: open NEXT TO the clicked group node, not glued to the
  // right edge. Node on the right half → panel opens to its left (and vice
  // versa); node low on the canvas → the vertical clamp pushes the panel up.
  // The panel never covers the top controls row or the bottom draft toolbar,
  // and is capped in height rather than running the full canvas.
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    height: number;
    // Entry-animation offset: the panel slides in FROM the node's direction
    // (origin-aware, like the components panel rising from the toolbar).
    dx: number;
    dy: number;
  } | null>(null);

  // canvas edge margin
  const MARGIN = 24;
  // On the right side nothing sits below the header actions row, and the
  // bottom toolbar is centered — the panel can run nearly edge to edge.
  // TOP clears the header actions row.
  const TOP = 75;
  const BOTTOM = 19;

  // Width changes while OPEN (the header action row grows with the
  // change-count badge on every applied toggle) reposition in place — going
  // through the open effect below unmounted the panel for a frame (flash)
  // and replayed the slide-in.
  useEffect(() => {
    setPlacement((p) => {
      if (!p) return p;
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return p;
      return { ...p, left: container.width - panelWidth - MARGIN };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelWidth]);

  // panelWidth is read via a ref here so an open panel doesn't re-run the
  // whole open sequence (placement reset + pan) when the width shifts.
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;

  // Keep the panel fitted when the window/canvas is resized. The open effect
  // below only runs on open, so a resize would otherwise leave the box sized
  // for the old container (clipped or floating off the edge). Recompute
  // left/top/height against the new container size.
  useEffect(() => {
    const onResize = () => {
      setPlacement((p) => {
        if (!p) return p;
        const container = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!container) return p;
        return {
          ...p,
          left: container.width - panelWidthRef.current - MARGIN,
          top: TOP,
          height: container.height - TOP - BOTTOM,
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!groupId) {
      setPlacement(null);
      return;
    }
    // Post-layout: the panel width settles via ResizeObserver a frame after
    // mount, so measure after that. Switching from one group to another
    // keeps the CURRENT placement mounted (no unmount frame, no replayed
    // slide-in) — only the box is refreshed and the pan below runs.
    const timer = window.setTimeout(() => {
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return;
      const height = container.height - TOP - BOTTOM;
      const left = container.width - panelWidthRef.current - MARGIN;
      // Anchored to the right side, sliding in from the right (like the
      // bottom toolbar slides up from the bottom) — but only on a fresh
      // open; while already open just update the box in place.
      setPlacement((p) =>
        p ? { ...p, left, top: TOP, height } : { left, top: TOP, height, dx: 48, dy: 0 },
      );

      // If the panel covers the selected group's node, pan the canvas left
      // just far enough that the node clears the panel (small margin).
      const node = reactFlow
        .getNodes()
        .find(
          (n) =>
            isPanelGroupNode(n) &&
            (n.id === groupId || getNodeGroup(n)?.id === groupId),
        );
      const internal = node && reactFlow.getInternalNode(node.id);
      if (!node || !internal) return;
      const { zoom } = reactFlow.getViewport();
      const p = reactFlow.flowToScreenPosition(
        internal.internals.positionAbsolute,
      );
      const nodeLeft = p.x - container.left;
      const nodeTop = p.y - container.top;
      const nodeRight = nodeLeft + (node.measured?.width ?? 0) * zoom;
      const nodeBottom = nodeTop + (node.measured?.height ?? 0) * zoom;
      const overlaps =
        nodeRight > left && nodeBottom > TOP && nodeTop < TOP + height;
      if (!overlaps) return;
      const delta = nodeRight - left + 64;
      const vp = reactFlow.getViewport();
      void reactFlow.setViewport({ ...vp, x: vp.x - delta }, { duration: 300 });
    }, 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Implicit closes (Esc, the ESC keycap, canvas pane clicks) confirm first
  // when there are unassigned toggles; the explicit Cancel button discards
  // without asking. Returns whether closing may proceed.
  const confirmDiscard = async () => {
    if (!dirty || !canEditMembers) return true;
    return !!(await confirm({
      title: "Unsaved Changes",
      description: `The members you toggled for “${
        group?.name ?? "this group"
      }” haven't been ${
        isDraft ? "applied" : "saved"
      } yet. Closing the panel will lose them.`,
      confirmText: "Discard",
      cancelText: "Cancel",
      type: "danger",
      dismissOnOutsideClick: true,
    }));
  };
  const requestClose = async () => {
    if (await confirmDiscard()) onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // External close paths (pane click in page.tsx) consult the same dialog.
  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;
  useEffect(() => {
    if (!groupId) return;
    groupPanelCloseGuard.current = () => confirmDiscardRef.current();
    return () => {
      groupPanelCloseGuard.current = null;
    };
  }, [groupId]);

  // Esc closes the panel (unless something above us — e.g. a Radix modal —
  // already handled it).
  useEffect(() => {
    if (!groupId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void requestCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [groupId]);

  // Singleton: always mounted so the (large) peer/resource lists aren't
  // rebuilt on every open — nothing renders while no group is selected or
  // until the spot next to the node is known; the entry animation then
  // plays from the node's direction.
  if (!groupId || !placement) return null;

  return (
    // NO key: switching groups swaps the data inside the SAME panel element
    // (no exit/enter animation, no subtree rebuild) — the entry animation
    // only plays when the panel opens from closed (mounts from null).
    <motion.div
      id={"cc-group-panel"}
      initial={{ opacity: 0, x: placement.dx, y: placement.dy }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      // Same spring as the bottom toolbar sliding up from the bottom.
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className={cn(
        "absolute z-20 flex flex-col",
        // Same surface as the draft components panel.
        "rounded-lg border border-nb-gray-910 bg-nb-gray-935 shadow-xl",
      )}
      style={{
        width: panelWidth,
        left: placement.left,
        top: placement.top,
        height: placement.height,
      }}
    >
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          // Same as the PeerGroupSelector tabs: switching puts the cursor
          // straight back into the search.
          searchInputRef.current?.focus();
        }}
        className={"flex-1 min-h-0 flex flex-col"}
      >
        {/* Search on top — same look as the PeerGroupSelector dropdown
            search, with the ESC keycap top right (closes the panel). */}
        <div className={"relative shrink-0 flex items-center pr-4 pt-1"}>
          <input
            className={cn(
              "min-h-[44px] w-full relative border-none",
              "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
              "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-11 pr-2",
            )}
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            placeholder={
              tab === "peers"
                ? "Search peer by name or ip..."
                : "Search resource..."
            }
          />
          {/* top-1 mirrors the row's pt-1 so the icon centers on the INPUT,
              not the padded row. */}
          <div
            className={"absolute left-0 top-1 bottom-0 flex items-center pl-5"}
          >
            <SearchIcon size={14} />
          </div>
          {/* ESC badge instead of an X — an X next to the search reads as
              "clear the search"; this closes the whole panel. */}
          <button
            onClick={() => void requestClose()}
            className={cn(
              "shrink-0 px-1.5 py-0.5 rounded border border-nb-gray-900 bg-nb-gray-920",
              // Keycap: 2px "side" below + faint highlight on top.
              "shadow-[0_2px_0_0_#1e2123,inset_0_1px_0_0_rgba(255,255,255,0.05)]",
              "text-[8px] font-medium tracking-wide text-nb-gray-350",
              "hover:bg-nb-gray-910 hover:text-nb-gray-200 transition-colors",
            )}
          >
            ESC
          </button>
        </div>

        <div className={"shrink-0 flex items-center"}>
          <TabsList justify={"start"} className={"px-4 flex-1"}>
            <TabsTrigger value={"peers"} className={"text-[.8rem] font-normal"}>
              <MonitorSmartphoneIcon
                size={14}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Peers
            </TabsTrigger>
            <TabsTrigger
              value={"resources"}
              className={"text-[.8rem] font-normal"}
            >
              <Layers3Icon
                size={14}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Resources
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={"peers"} className={"flex-1 min-h-0 m-0 p-0"}>
          {/* Virtualized (react-virtuoso) — big accounts render only the
              visible slice instead of every peer row. */}
          {peerRows.length > 0 ? (
            <MemoizedScrollArea withoutViewport={true} className={"h-full"}>
              <Virtuoso
                // Remount per group: Virtuoso keeps its scroll offset across
                // data swaps — switching groups would land mid-list.
                key={`${groupId}-peers`}
                data={peerRows}
                overscan={300}
                defaultItemHeight={54}
                computeItemKey={(index) => peerRows[index].id ?? String(index)}
                itemContent={(index, peer) => (
                  <div className={cn("px-3 pb-0.5", index === 0 && "pt-3")}>
                    <MemberRow
                      checked={selectedPeerIds.has(peer.id ?? "")}
                      onToggle={
                        canEditMembers ? () => togglePeer(peer) : undefined
                      }
                    >
                      <DeviceCard
                        // Draft peers show the same dimmed "assigned on
                        // install" IP placeholder as their canvas card.
                        device={
                          peer.id?.startsWith("draft-")
                            ? {
                                ...peer,
                                ip: getIpPlaceholderFromRange(
                                  account?.settings?.network_range,
                                ),
                              }
                            : peer
                        }
                        size="small"
                        className="flex-1"
                        nameMaxWidth="260px"
                        // Draft peers wear the same NEW badge as on canvas.
                        badge={
                          peer.id?.startsWith("draft-") ? (
                            <SmallBadge />
                          ) : undefined
                        }
                      />
                      {isDraft && peer.id?.startsWith("draft-") && (
                        <DraftPeerRowActions draftPeer={peer} />
                      )}
                    </MemberRow>
                  </div>
                )}
                components={{ Scroller: PanelVirtuosoScroller }}
                style={{ height: "100%" }}
              />
            </MemoizedScrollArea>
          ) : (
            <div className={"px-3 pt-3"}>
              <DropdownInfoText className={"mt-5 max-w-sm mx-auto text-sm"}>
                {query
                  ? "There are no peers matching your search. Please try a different search term."
                  : "There are no peers in this group yet."}
              </DropdownInfoText>
            </div>
          )}
        </TabsContent>
        <TabsContent value={"resources"} className={"flex-1 min-h-0 m-0 p-0"}>
          {resourceRows.length > 0 ? (
            <MemoizedScrollArea withoutViewport={true} className={"h-full"}>
              <Virtuoso
                key={`${groupId}-resources`}
                data={resourceRows}
                overscan={300}
                defaultItemHeight={54}
                computeItemKey={(index) => resourceRows[index].id}
                itemContent={(index, resource) => (
                  <div className={cn("px-3 pb-0.5", index === 0 && "pt-3")}>
                    <MemberRow
                      checked={selectedResourceIds.has(resource.id)}
                      onToggle={
                        canEditMembers
                          ? () => toggleResource(resource)
                          : undefined
                      }
                    >
                      <DeviceCard
                        // Draft resources without an address show the same
                        // dimmed placeholder as their canvas card.
                        resource={
                          resource.id?.startsWith("new-") && !resource.address
                            ? { ...resource, address: "IP, CIDR or Domain" }
                            : resource
                        }
                        size="small"
                        className="flex-1"
                        nameMaxWidth="260px"
                        badge={
                          resource.id?.startsWith("new-") ? (
                            <SmallBadge />
                          ) : undefined
                        }
                      />
                      {isDraft &&
                        resource.id?.startsWith("new-") &&
                        !(resource as { draftNetwork?: unknown })
                          .draftNetwork && (
                          <DraftStatusChip
                            label={"No Network"}
                            onClick={() =>
                              setResourceNetworkPicker({
                                nodeId: `resource-${resource.id}`,
                              })
                            }
                          />
                        )}
                    </MemberRow>
                  </div>
                )}
                components={{ Scroller: PanelVirtuosoScroller }}
                style={{ height: "100%" }}
              />
            </MemoizedScrollArea>
          ) : (
            <div className={"px-3 pt-3"}>
              <DropdownInfoText className={"mt-5 max-w-sm mx-auto text-sm"}>
                {query
                  ? "There are no resources matching your search. Please try a different search term."
                  : "There are no resources in this group yet."}
              </DropdownInfoText>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fixed footer — assigned count for the active tab on the left, Save
          applies the whole selection at once (draft: one changeset entry;
          live: one PUT behind the live-mode confirmation). */}
      {canEditMembers && (
        <div
          className={
            "shrink-0 border-t border-nb-gray-910 px-5 py-4 flex items-center justify-between"
          }
        >
          <span className={"text-xs text-nb-gray-400"}>
            {tab === "peers"
              ? `${selectedPeerIds.size} of ${totalPeers} Assigned`
              : `${selectedResourceIds.size} of ${totalResources} Assigned`}
          </span>
          <div className={"flex items-center gap-3"}>
            <Button
              variant={"secondary"}
              size={"xs"}
              className={"py-2.5"}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant={"primary"}
              size={"xs"}
              className={"relative py-2.5"}
              disabled={!dirty || saving}
              onClick={() => void saveMembership()}
            >
              {/* Spinner while saving, but keep the label's width (no jump). */}
              <span className={cn(saving && "invisible")}>
                {isDraft ? "Assign" : "Save"}
              </span>
              {saving && (
                <Loader2
                  size={14}
                  className={
                    "animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  }
                />
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
