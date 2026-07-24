import { cn } from "@utils/helpers";
import { Layers3Icon, MonitorSmartphoneIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSWRConfig } from "swr";
import { useReactFlow } from "@xyflow/react";
import { useApiCall } from "@utils/api";
import { useDialog } from "@/contexts/DialogProvider";
import Button from "@components/Button";
import { ScrollArea } from "@components/ScrollArea";
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
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useStructuralNodes } from "@/modules/control-center/utils/helpers";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
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

const MIN_PANEL_WIDTH = 398;

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
function usePanelWidth() {
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
const MemberRow = ({
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
      onToggle && "hover:bg-nb-gray-900/50 cursor-pointer",
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

export const DestinationGroupPanel = ({
  groupId,
  onClose,
}: DestinationGroupPanelProps) => {
  const { peers, networkResources, groups } = useControlCenterData();
  // Structural subscription — the panel derives from node data only, and a
  // context nodes subscription re-rendered it (and its member lists) on
  // every canvas update while open.
  const nodes = useStructuralNodes();
  const { setNodes } = useCanvasState();
  const { isDraft } = useDraftMode();
  const { removeGroupMember } = useDraftGroupActions();
  const { addMemberToGroup } = useDragToGroup();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const groupRequest = useApiCall<Group>("/groups", true);
  const panelWidth = usePanelWidth();
  const reactFlow = useReactFlow();

  // In draft the canvas node is the source of truth (it carries renames and
  // drag-added members); the API group is the live-mode fallback. A group can
  // exist on the canvas more than once (source node + destination copy).
  const groupNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          isGroupNode(n) &&
          (n.id === groupId || getNodeGroup(n)?.id === groupId),
      ),
    [nodes, groupId],
  );
  const groupNode = groupNodes[0];

  const group: Group | undefined = useMemo(() => {
    if (isDraft && groupNode) return getNodeGroup(groupNode);
    return groups?.find((g) => g.id === groupId) ?? getNodeGroup(groupNode);
  }, [isDraft, groupNode, groups, groupId]);

  const realGroupId = group?.id ?? "";

  // Draft membership edits live on the canvas nodes, not in the API data yet.
  const addedMembers = useMemo(() => {
    const added = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.addedMembers as Set<string> | undefined;
      members?.forEach((id) => added.add(id));
    });
    return added;
  }, [groupNodes]);
  const removedMembers = useMemo(() => {
    const removed = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.removedMembers as Set<string> | undefined;
      members?.forEach((id) => removed.add(id));
    });
    return removed;
  }, [groupNodes]);

  const groupPeers = useMemo(() => {
    if (!peers) return [];
    const existing = realGroupId ? getGroupPeers(peers, realGroupId) : [];
    const addedPeers = peers.filter(
      (p) =>
        p.id && addedMembers.has(p.id) && !existing.some((e) => e.id === p.id),
    );
    return [...existing, ...addedPeers].filter(
      (p) => !removedMembers.has(p.id ?? ""),
    );
  }, [peers, realGroupId, addedMembers, removedMembers]);

  const resources = useMemo(() => {
    if (!networkResources) return [];
    const existing = realGroupId
      ? getGroupResources(networkResources, realGroupId)
      : [];
    const addedResources = networkResources.filter(
      (r) => addedMembers.has(r.id) && !existing.some((e) => e.id === r.id),
    );
    return [...existing, ...addedResources].filter(
      (r) => !removedMembers.has(r.id),
    );
  }, [networkResources, realGroupId, addedMembers, removedMembers]);

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
  // (draft: ONE coalesced changeset entry; live: one PUT).
  const togglePeer = (peer: Peer) =>
    peer.id && setSelectedPeerIds((prev) => toggleId(prev, peer.id!));
  const toggleResource = (resource: NetworkResource) =>
    setSelectedResourceIds((prev) => toggleId(prev, resource.id));

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

  // Count preview follows every toggle — nothing hits the API until Save, so
  // no debounce. The one-tick deferral (with cleanup) is NOT a debounce: on
  // open the selection is momentarily stale (empty) until the sync effect
  // above lands, and writing that stale 0 to the node flipped its label to
  // "No Peers" — the resync re-render cancels the pending stale write.
  useEffect(() => {
    if (!canEditMembers || !dirty) return;
    const timer = window.setTimeout(
      () => syncNodeCounts(selectedPeerIds.size, selectedResourceIds.size),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [
    canEditMembers,
    dirty,
    selectedPeerIds,
    selectedResourceIds,
    syncNodeCounts,
  ]);

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
      // Applying closes the panel. The unmount cleanup restores the counts
      // snapshot — point it at the just-applied selection so it doesn't
      // revert the apply.
      restoreCountsRef.current = {
        sync: syncNodeCounts,
        peers: selectedPeerIds.size,
        resources: selectedResourceIds.size,
      };
      onClose();
      return;
    }

    // Live — the PUT hits the account immediately, so confirm first.
    if (!group.id) return;
    const choice = await confirm({
      title: `Save group “${group.name}”?`,
      description:
        "You are in live mode — saving your changes will apply them to your account immediately.",
      confirmText: "Save",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;
    setSaving(true);
    try {
      await groupRequest.put(
        {
          name: group.name,
          peers: [...selectedPeerIds],
          resources: [...selectedResourceIds],
        },
        `/${group.id}`,
      );
      // Membership lives on /groups and /peers (peer.groups) — refresh both
      // so the panel and the rebuilt view pick the change up.
      await Promise.all([mutate("/groups"), mutate("/peers")]);
    } finally {
      setSaving(false);
    }
  };

  // ---- Search + tabs ----

  const [tab, setTab] = useState("peers");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch("");
    setTab("peers");
    // autoFocus only fires on mount — refocus when switching groups too.
    searchInputRef.current?.focus();
  }, [groupId]);

  const query = search.trim().toLowerCase();

  // Members-first ORDER is frozen per open: it partitions by the membership
  // AT OPEN TIME, not the live one — toggling would otherwise reshuffle the
  // list under the pointer. Null until the data is loaded.
  const [orderSnapshot, setOrderSnapshot] = useState<{
    peers: Set<string>;
    resources: Set<string>;
  } | null>(null);
  useEffect(() => {
    setOrderSnapshot(null);
  }, [groupId]);
  useEffect(() => {
    if (orderSnapshot || !groupId || !peers || !networkResources) return;
    setOrderSnapshot({
      peers: new Set(memberPeerIds),
      resources: new Set(memberResourceIds),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSnapshot, groupId, peers, networkResources]);
  const peerOrder = orderSnapshot?.peers ?? memberPeerIds;
  const resourceOrder = orderSnapshot?.resources ?? memberResourceIds;

  // Draft: EVERY peer/resource is listed (members first, checked) so the
  // checkbox doubles as assign/unassign — same pattern as PeerGroupSelector.
  // Live: members only.
  const peerRows = useMemo(() => {
    const all = canEditMembers
      ? [
          ...(peers ?? []).filter((p) => p.id && peerOrder.has(p.id)),
          ...(peers ?? []).filter((p) => p.id && !peerOrder.has(p.id)),
        ]
      : groupPeers;
    if (!query) return all;
    return all.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.ip?.toLowerCase().includes(query) ||
        p.dns_label?.toLowerCase().includes(query),
    );
  }, [canEditMembers, groupPeers, peers, peerOrder, query]);

  const resourceRows = useMemo(() => {
    const all = canEditMembers
      ? [
          ...(networkResources ?? []).filter((r) => resourceOrder.has(r.id)),
          ...(networkResources ?? []).filter((r) => !resourceOrder.has(r.id)),
        ]
      : resources;
    if (!query) return all;
    return all.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query),
    );
  }, [canEditMembers, resources, networkResources, resourceOrder, query]);

  // Footer count — total assignable entities per tab.
  const totalPeers = (peers ?? []).filter((p) => p.id).length;
  const totalResources = (networkResources ?? []).length;

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

  const MARGIN = 24; // canvas edge margin
  // On the right side nothing sits below the header actions row, and the
  // bottom toolbar is centered — the panel can run nearly edge to edge.
  const TOP = 75; // header actions row
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

  useEffect(() => {
    setPlacement(null);
    if (!groupId) return;
    // Post-layout: the panel width settles via ResizeObserver a frame after
    // mount, so measure after that.
    const timer = window.setTimeout(() => {
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return;
      const height = container.height - TOP - BOTTOM;
      const left = container.width - panelWidthRef.current - MARGIN;
      // Anchored to the right side, sliding in from the right (like the
      // bottom toolbar slides up from the bottom).
      setPlacement({ left, top: TOP, height, dx: 48, dy: 0 });

      // If the panel covers the selected group's node, pan the canvas left
      // just far enough that the node clears the panel (small margin).
      const node = reactFlow
        .getNodes()
        .find(
          (n) =>
            isGroupNode(n) &&
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
      title: `Discard changes to “${group?.name ?? "group"}”?`,
      description: `You have unassigned changes that haven't been ${
        isDraft ? "applied" : "saved"
      }.`,
      confirmText: "Discard",
      cancelText: "Keep editing",
      type: "warning",
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
    <motion.div
      key={groupId}
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

        {/* Tabs below the search. */}
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
          <ScrollArea className={"h-full"}>
            <div className="px-3 pt-3 pb-2 flex flex-col gap-0.5">
              {peerRows.map((peer) => (
                <MemberRow
                  key={peer.id}
                  checked={selectedPeerIds.has(peer.id ?? "")}
                  onToggle={canEditMembers ? () => togglePeer(peer) : undefined}
                >
                  <DeviceCard
                    device={peer}
                    size="small"
                    className="flex-1"
                    nameMaxWidth="260px"
                  />
                </MemberRow>
              ))}
              {peerRows.length === 0 && (
                <DropdownInfoText className={"mt-5 max-w-sm mx-auto text-sm"}>
                  {query
                    ? "There are no peers matching your search. Please try a different search term."
                    : "There are no peers in this group yet."}
                </DropdownInfoText>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value={"resources"} className={"flex-1 min-h-0 m-0 p-0"}>
          <ScrollArea className={"h-full"}>
            <div className="px-3 pt-3 pb-2 flex flex-col gap-0.5">
              {resourceRows.map((resource) => (
                <MemberRow
                  key={resource.id}
                  checked={selectedResourceIds.has(resource.id)}
                  onToggle={
                    canEditMembers ? () => toggleResource(resource) : undefined
                  }
                >
                  <DeviceCard
                    resource={resource}
                    size="small"
                    className="flex-1"
                    nameMaxWidth="260px"
                  />
                </MemberRow>
              ))}
              {resourceRows.length === 0 && (
                <DropdownInfoText className={"mt-5 max-w-sm mx-auto text-sm"}>
                  {query
                    ? "There are no resources matching your search. Please try a different search term."
                    : "There are no resources in this group yet."}
                </DropdownInfoText>
              )}
            </div>
          </ScrollArea>
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
              className={"py-2.5"}
              disabled={!dirty || saving}
              onClick={() => void saveMembership()}
            >
              {saving ? "Saving..." : isDraft ? "Assign" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
