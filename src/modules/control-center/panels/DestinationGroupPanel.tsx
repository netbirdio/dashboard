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
  // Real group id, or the canvas node id for draft groups without an API id.
  groupId: string;
  onClose: () => void;
}

export const MIN_PANEL_WIDTH = 398;

export const PanelVirtuosoScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <ScrollAreaViewport ref={ref} {...props} />);
PanelVirtuosoScroller.displayName = "PanelVirtuosoScroller";


// External close paths must consult this before clearing the selection.
export const groupPanelCloseGuard: {
  current: null | (() => Promise<boolean>);
} = { current: null };

// Tracks the header action row's width so the panel's left edge lines up with it.
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

export const setEquals = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

const PANEL_MARGIN = 24;

export type PanelPlacement = { left: number; top: number; height: number };

// Anchored to the canvas' right edge, inset to clear the header row and the toolbar.
export function usePanelPlacement({
  openKey,
  panelWidth,
  top,
  bottom,
  onPlaced,
}: {
  openKey: string;
  panelWidth: number;
  top: number;
  bottom: number;
  onPlaced?: (container: DOMRect, placement: PanelPlacement) => void;
}) {
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const onPlacedRef = useRef(onPlaced);
  useEffect(() => {
    onPlacedRef.current = onPlaced;
  });

  // Reposition in place on a width change; the open effect below replays the slide-in.
  useEffect(() => {
    setPlacement((p) => {
      if (!p) return p;
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return p;
      return { ...p, left: container.width - panelWidth - PANEL_MARGIN };
    });
  }, [panelWidth]);

  // Read via a ref so a width shift doesn't re-run the open sequence on an open panel.
  const panelWidthRef = useRef(panelWidth);
  useEffect(() => {
    panelWidthRef.current = panelWidth;
  });

  // The open effect only runs on open, so resizes must re-measure here.
  useEffect(() => {
    const onResize = () => {
      setPlacement((p) => {
        if (!p) return p;
        const container = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!container) return p;
        return {
          left: container.width - panelWidthRef.current - PANEL_MARGIN,
          top,
          height: container.height - top - bottom,
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [top, bottom]);

  useEffect(() => {
    if (!openKey) {
      setPlacement(null);
      return;
    }
    // The panel width settles via ResizeObserver a frame after mount.
    const timer = window.setTimeout(() => {
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return;
      const next = {
        left: container.width - panelWidthRef.current - PANEL_MARGIN,
        top,
        height: container.height - top - bottom,
      };
      setPlacement(next);
      onPlacedRef.current?.(container, next);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [openKey, top, bottom]);

  return placement;
}

// Esc closes unless something above (e.g. a Radix modal) already handled the key.
export function usePanelCloseGuard(
  openKey: string,
  confirmDiscard: () => Promise<boolean>,
  onClose: () => void,
) {
  const requestClose = async () => {
    if (await confirmDiscard()) onClose();
  };
  const requestCloseRef = useRef(requestClose);
  const confirmDiscardRef = useRef(confirmDiscard);
  useEffect(() => {
    requestCloseRef.current = requestClose;
    confirmDiscardRef.current = confirmDiscard;
  });

  useEffect(() => {
    if (!openKey) return;
    groupPanelCloseGuard.current = () => confirmDiscardRef.current();
    return () => {
      groupPanelCloseGuard.current = null;
    };
  }, [openKey]);

  useEffect(() => {
    if (!openKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void requestCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openKey]);

  return requestClose;
}

export const MemberRow = ({
  children,
  checked,
  onToggle,
}: React.PropsWithChildren<{
  checked?: boolean;
  // Absent = read-only row (live mode / "All" group).
  onToggle?: () => void;
}>) => (
  <div
    onClick={onToggle}
    className={cn(
      "flex items-center h-[52px] rounded-md px-1 transition-colors",
      // No row hover while an inline chip is hovered: it owns the click.
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
  // Structural subscription: a nodes subscription re-renders the panel on every canvas update.
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

  // A framed resource group counts as a group here; the shared isGroupNode set excludes it.
  const isPanelGroupNode = (n: (typeof nodes)[number]) =>
    isGroupNode(n) || n.type === "resourceGroupNode";
  const groupNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          isPanelGroupNode(n) &&
          (n.id === groupId || getNodeGroup(n)?.id === groupId),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render-local predicate would defeat the memo
    [nodes, groupId],
  );
  const groupNode = groupNodes[0];

  // In draft the canvas node is the source of truth: it carries renames and drag-added members.
  const group: Group | undefined = useMemo(() => {
    if (isDraft && groupNode) return getNodeGroup(groupNode);
    return groups?.find((g) => g.id === groupId) ?? getNodeGroup(groupNode);
  }, [isDraft, groupNode, groups, groupId]);

  const preferResourcesTab =
    groupNode?.type === "resourceGroupNode" ||
    !!groupNode?.parentId?.startsWith("network-") ||
    (group?.resources_count ?? 0) > (group?.peers_count ?? 0);

  const realGroupId = group?.id ?? "";

  // The changeset is authoritative: a canvas rebuild or SWR mutate drops node data.
  const addedMembers = useMemo(() => {
    const added = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.addedMembers as Set<string> | undefined;
      members?.forEach((id) => added.add(id));
    });
    if (isDraft) {
      changes.forEach((c) => {
        if (
          (c.type === "create-group" && c.name === group?.name) ||
          (c.type === "update-group" && c.groupId === realGroupId)
        ) {
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

  // Draft members aren't in the API lists; their objects ride on the group node.
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

  // Canvas placeholders are assignable too: checking one absorbs its node, like a drop.
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
  // Keyed by CONTENT: node updates rebuild the sets, so identity deps wiped the selection.
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
  }, [groupId, memberPeersKey]);
  useEffect(() => {
    setSelectedResourceIds(
      new Set(memberResourcesKey ? memberResourcesKey.split(",") : []),
    );
  }, [groupId, memberResourcesKey]);

  const dirty =
    !setEquals(selectedPeerIds, memberPeerIds) ||
    !setEquals(selectedResourceIds, memberResourceIds);

  const toggleId = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  // Previewed from here, not an effect: an effect can't tell a toggle from the open transient.
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

  // So the group's canvas subtitle follows the checkboxes.
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

  // Only for standalone resource nodes (`!parentId`); a framed row attaches differently.
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

  // Unsaved toggles revert on close.
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

  // Updated in an effect, so the cleanup below still sees the leaving group's values.
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
      // Reset to the actual membership so the increments below land on the right baseline.
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
      // Draft members are rows only while they are members, so the only edit is unassigning.
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
      // A checked canvas placeholder's node is absorbed, exactly like a drop.
      canvasPlaceholderPeers.forEach(({ peer, nodeId }, id) => {
        if (selectedPeerIds.has(id) && !memberPeerIds.has(id)) {
          addMemberToGroup(groupNode, { peer, draggedNodeId: nodeId });
        }
      });
      // Point the unmount snapshot at the applied selection so the cleanup doesn't revert it.
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
    // Resources must be {id, type} objects; id strings make the API reject the body.
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
        // Membership shows on all four lists; skipping one leaves stale counts elsewhere.
        await Promise.all([
          mutate("/groups"),
          mutate("/peers"),
          mutate("/networks/resources"),
          mutate("/policies"),
        ]);
        return g;
      });
    // useApiCall rejects (ignoreError=true), so the toast must be promise-driven.
    notify({
      title: group.name,
      description: `${group.name} was successfully saved.`,
      promise: request,
    });
    try {
      await request;
      // DON'T rebuild the view: the toggles already previewed it, and a rebuild refits.
      savedRef.current = true;
      restoreCountsRef.current = {
        sync: syncNodeCounts,
        peers: selectedPeerIds.size,
        resources: selectedResourceIds.size,
      };
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
    setTab(preferResourcesTab ? "resources" : "peers");
    // autoFocus only fires on mount, so refocus when switching groups too.
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- must reset only on group switch
  }, [groupId]);

  const query = search.trim().toLowerCase();

  // Draft lists every peer so the checkbox doubles as assign/unassign.
  const peerCandidates = useMemo(() => {
    if (!canEditMembers) return groupPeers;
    return [
      ...draftMemberPeers,
      ...(peers ?? []).filter((p) => p.id && memberPeerIds.has(p.id)),
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

  // Row order frozen per open, so toggling and the post-save mutate don't reorder rows.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- candidate lists are snapshotted, not tracked
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

  const totalPeers =
    (peers ?? []).filter((p) => p.id).length +
    draftMemberPeers.length +
    [...canvasPlaceholderPeers.keys()].filter((id) => !addedMembers.has(id))
      .length;
  const totalResources =
    (networkResources ?? []).length + draftMemberResources.length;

  // Pans the canvas left if the selected node would sit under the panel.
  const placement = usePanelPlacement({
    openKey: groupId,
    panelWidth,
    top: 75,
    bottom: 19,
    onPlaced: (container, { left, top, height }) => {
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
        nodeRight > left && nodeBottom > top && nodeTop < top + height;
      if (!overlaps) return;
      const delta = nodeRight - left + 64;
      const vp = reactFlow.getViewport();
      void reactFlow.setViewport({ ...vp, x: vp.x - delta }, { duration: 300 });
    },
  });

  // Implicit closes (Esc, pane clicks) confirm first; the Cancel button just discards.
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
  const requestClose = usePanelCloseGuard(groupId, confirmDiscard, onClose);

  // Always mounted so the large member lists aren't rebuilt on every open.
  if (!groupId || !placement) return null;

  return (
    // NO key: switching groups must not replay the entry animation.
    <motion.div
      id={"cc-group-panel"}
      initial={{ opacity: 0, x: 48, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className={cn(
        "absolute z-20 flex flex-col",
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
          searchInputRef.current?.focus();
        }}
        className={"flex-1 min-h-0 flex flex-col"}
      >
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
          {/* top-1 mirrors the row's pt-1 so the icon centers on the input. */}
          <div
            className={"absolute left-0 top-1 bottom-0 flex items-center pl-5"}
          >
            <SearchIcon size={14} />
          </div>
          {/* ESC badge, not an X: an X here would read as "clear the search". */}
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
          {peerRows.length > 0 ? (
            <MemoizedScrollArea withoutViewport={true} className={"h-full"}>
              <Virtuoso
                // Remount per group: Virtuoso keeps its scroll offset across data swaps.
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
              {/* Keep the label's width while saving so nothing jumps. */}
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
