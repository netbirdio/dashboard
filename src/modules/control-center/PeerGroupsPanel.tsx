import { FolderGit2, SearchIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSWRConfig } from "swr";
import { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { useDialog } from "@/contexts/DialogProvider";
import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { MemoizedScrollArea } from "@components/ScrollArea";
import { Virtuoso } from "react-virtuoso";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import { Group } from "@/interfaces/Group";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  getGroupCountLabel,
  getPlaceholderPeer,
  pinByOrder,
  useStructuralNodes,
} from "@/modules/control-center/utils/helpers";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import {
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import {
  groupPanelCloseGuard,
  MemberRow,
  PanelVirtuosoScroller,
  usePanelWidth,
} from "@/modules/control-center/DestinationGroupPanel";

interface PeerGroupsPanelProps {
  // Real peer id (empty = closed). The peer-side twin of the group panel:
  // one Groups tab where the peer's group assignments are toggled.
  peerId: string;
  onClose: () => void;
}

// A group's stable reference — API id, or the name for draft-created groups.
const groupRef = (g: Group) => g.id ?? g.name;

export const PeerGroupsPanel = ({ peerId, onClose }: PeerGroupsPanelProps) => {
  const { peers, groups } = useControlCenterData();
  const nodes = useStructuralNodes();
  const { isDraft } = useDraftMode();
  const { changes, trackAddGroupMembers } = useDraftChangeset();
  const { removeGroupMember } = useDraftGroupActions();
  const { addMemberToGroup } = useDragToGroup();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const groupRequest = useApiCall<Group>("/groups", true);
  const panelWidth = usePanelWidth();

  const peer = useMemo(
    () =>
      peers?.find((p) => p.id === peerId) ??
      // Placeholder peers (draft-…) aren't in the API list — resolve them
      // from their canvas node so groups can be assigned pre-install
      // (assignments become the setup key's auto-groups / deploy after the
      // peer registers).
      getPlaceholderPeer(nodes.find((n) => n.id === `peer-${peerId}`)),
    [peers, peerId, nodes],
  );

  // Assignable groups: API groups plus draft-created ones (create-group
  // changes) — "All" is automatic and excluded.
  const allGroups = useMemo(() => {
    const draftGroups: Group[] = isDraft
      ? changes
          .filter((c) => c.type === "create-group")
          .map((c) => ({ name: (c as { name: string }).name }) as Group)
      : [];
    return [...(groups ?? []), ...draftGroups].filter((g) => !isAllGroup(g));
  }, [groups, changes, isDraft]);

  // Membership: the peer's API groups, adjusted by the draft changeset
  // (update-group add/remove lists + create-group member lists).
  const assignedRefs = useMemo(() => {
    const assigned = new Set<string>();
    // "All" is excluded from the list, so it must not count as assigned
    // either — otherwise the footer counts an invisible membership.
    (peer?.groups ?? []).forEach(
      (g) => g.id && !isAllGroup(g) && assigned.add(g.id),
    );
    if (isDraft) {
      changes.forEach((c) => {
        if (c.type === "create-group") {
          if (c.peerIds.includes(peerId)) assigned.add(c.name);
        } else if (c.type === "update-group") {
          if (c.peerIds.includes(peerId)) assigned.add(c.groupId);
          if (c.removedPeerIds?.includes(peerId)) assigned.delete(c.groupId);
        }
      });
    }
    return assigned;
  }, [peer, changes, isDraft, peerId]);
  const assignedKey = useMemo(
    () => [...assignedRefs].sort().join(","),
    [assignedRefs],
  );

  // ---- Local selection, applied in one go via Assign/Save ----

  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelectedRefs(new Set(assignedKey ? assignedKey.split(",") : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, assignedKey]);

  const setEquals = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((id) => b.has(id));
  const dirty = !setEquals(selectedRefs, assignedRefs);

  const toggleGroup = (g: Group) => {
    const ref = groupRef(g);
    if (!ref) return;
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const [saving, setSaving] = useState(false);

  const saveAssignments = async () => {
    if (!peer?.id) return;
    // Narrowed once here — the async IIFE below re-widens peer.id otherwise.
    const peerId = peer.id;
    const added = allGroups.filter(
      (g) => selectedRefs.has(groupRef(g)) && !assignedRefs.has(groupRef(g)),
    );
    const removed = allGroups.filter(
      (g) => !selectedRefs.has(groupRef(g)) && assignedRefs.has(groupRef(g)),
    );

    if (isDraft) {
      added.forEach((g) => {
        // Groups ON the canvas get the full treatment (counts + member
        // sets); off-canvas ones land straight in the changeset.
        const node = nodes.find(
          (n) =>
            isGroupNode(n) &&
            (g.id
              ? getNodeGroup(n)?.id === g.id
              : !getNodeGroup(n)?.id && getNodeGroup(n)?.name === g.name),
        );
        if (node) {
          addMemberToGroup(node, { peer });
        } else {
          trackAddGroupMembers({
            groupId: g.id,
            groupName: g.name ?? "",
            peerIds: [peer.id!],
          });
        }
      });
      removed.forEach((g) => removeGroupMember(g, { peerId: peer.id! }));
      onClose();
      return;
    }

    // Live — one PUT per changed group, behind a single confirmation.
    const choice = await confirm({
      title: `Save groups of “${peer.name}”?`,
      description:
        "You are in live mode — saving your changes will apply them to your account immediately.",
      confirmText: "Save",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;
    setSaving(true);
    const toIds = (list?: (string | { id?: string })[]) =>
      (list ?? []).map((x) => (typeof x === "string" ? x : x.id ?? ""));
    const request = (async () => {
      for (const g of [...added, ...removed]) {
        const full = groups?.find((x) => x.id === g.id);
        if (!full?.id) continue;
        const peerIds = new Set(toIds(full.peers));
        if (selectedRefs.has(full.id)) peerIds.add(peerId);
        else peerIds.delete(peerId);
        await groupRequest.put(
          {
            name: full.name,
            peers: [...peerIds],
            // Resources pass through untouched, as {id, type} objects — the
            // API rejects a body that sends them as id strings.
            resources: full.resources,
          },
          `/${full.id}`,
        );
      }
      await Promise.all([mutate("/groups"), mutate("/peers")]);
    })();
    // The promise drives the toast styling: green on success, red with the
    // API error on failure (useApiCall rejects but never toasts itself, so a
    // plain notify would have shown a green "success" for a failed save).
    notify({
      title: peer.name ?? "Peer",
      description: `Groups of ${peer.name ?? "the peer"} were successfully saved.`,
      promise: request,
    });
    try {
      await request;
    } catch {
      // A PUT in the loop may have partially applied — re-sync so the panel
      // and canvas reflect the server truth rather than the optimistic
      // selection.
      await Promise.all([mutate("/groups"), mutate("/peers")]).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  // ---- Search ----

  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, [peerId]);
  const query = search.trim().toLowerCase();

  // Assigned-first candidate list (seed order — pinned below).
  const groupCandidates = useMemo(
    () => [
      ...allGroups.filter((g) => assignedRefs.has(groupRef(g))),
      ...allGroups.filter((g) => !assignedRefs.has(groupRef(g))),
    ],
    [allGroups, assignedRefs],
  );

  // Row order FROZEN per open (the full id sequence): toggling, saving, and
  // the post-save SWR mutate (which can return the groups array reordered) all
  // leave rows in place. New groups sort to the end. Null until data is ready.
  const [rowOrder, setRowOrder] = useState<string[] | null>(null);
  useEffect(() => {
    setRowOrder(null);
  }, [peerId]);
  useEffect(() => {
    if (rowOrder || !peerId || !groups) return;
    setRowOrder(groupCandidates.map((g) => groupRef(g)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowOrder, peerId, groups]);

  const groupRows = useMemo(() => {
    const pinned = rowOrder
      ? pinByOrder(groupCandidates, rowOrder, (g) => groupRef(g))
      : groupCandidates;
    if (!query) return pinned;
    return pinned.filter((g) => g.name?.toLowerCase().includes(query));
  }, [groupCandidates, rowOrder, query]);

  // ---- Placement (same as the group panel: right side, full height) ----

  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);

  const MARGIN = 24;
  const TOP = 80;
  const BOTTOM = 24;

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

  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;

  // Keep the panel fitted when the window/canvas is resized — the open effect
  // below only runs on open, so a resize would otherwise leave the box sized
  // for the old container.
  useEffect(() => {
    const onResize = () => {
      setPlacement((p) => {
        if (!p) return p;
        const container = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!container) return p;
        return {
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
    if (!peerId) {
      setPlacement(null);
      return;
    }
    // Switching peers keeps the mounted panel (no unmount frame / replayed
    // slide-in) — only the box refreshes.
    const timer = window.setTimeout(() => {
      const container = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (!container) return;
      setPlacement({
        left: container.width - panelWidthRef.current - MARGIN,
        top: TOP,
        height: container.height - TOP - BOTTOM,
      });
    }, 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  // ---- Close handling (same discard guard as the group panel) ----

  const confirmDiscard = async () => {
    if (!dirty) return true;
    return !!(await confirm({
      title: "You have unsaved group changes",
      description: `The group assignments you toggled for “${
        peer?.name ?? "this peer"
      }” haven't been ${
        isDraft ? "applied" : "saved"
      } yet. Closing the panel will lose them.`,
      confirmText: "Discard",
      cancelText: "Keep editing",
      type: "warning",
      dismissOnOutsideClick: true,
    }));
  };
  const requestClose = async () => {
    if (await confirmDiscard()) onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;

  useEffect(() => {
    if (!peerId) return;
    groupPanelCloseGuard.current = () => confirmDiscardRef.current();
    return () => {
      groupPanelCloseGuard.current = null;
    };
  }, [peerId]);

  useEffect(() => {
    if (!peerId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void requestCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [peerId]);

  if (!peerId || !placement) return null;

  return (
    // NO key: switching peers swaps the data in the same mounted panel —
    // the entry animation only plays when opening from closed.
    <motion.div
      id={"cc-group-panel"}
      initial={{ opacity: 0, x: 48, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className={
        "absolute z-20 flex flex-col rounded-lg border border-nb-gray-910 bg-nb-gray-935 shadow-xl"
      }
      style={{
        width: panelWidth,
        left: placement.left,
        top: placement.top,
        height: placement.height,
      }}
    >
      <Tabs value={"groups"} className={"flex-1 min-h-0 flex flex-col"}>
        {/* Search on top — same chrome as the group panel. */}
        <div className={"relative shrink-0 flex items-center pr-4 pt-1"}>
          <input
            className={
              "min-h-[44px] w-full relative border-none bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0 dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-11 pr-2"
            }
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            placeholder={"Search group..."}
          />
          <div
            className={"absolute left-0 top-1 bottom-0 flex items-center pl-5"}
          >
            <SearchIcon size={14} />
          </div>
          {/* ESC badge instead of an X — closes the whole panel. */}
          <button
            onClick={() => void requestClose()}
            className={
              "shrink-0 px-1.5 py-0.5 rounded border border-nb-gray-900 bg-nb-gray-920 shadow-[0_2px_0_0_#1e2123,inset_0_1px_0_0_rgba(255,255,255,0.05)] text-[8px] font-medium tracking-wide text-nb-gray-350 hover:bg-nb-gray-910 hover:text-nb-gray-200 transition-colors"
            }
          >
            ESC
          </button>
        </div>

        <div className={"shrink-0 flex items-center"}>
          <TabsList justify={"start"} className={"px-4 flex-1"}>
            <TabsTrigger
              value={"groups"}
              className={"text-[.8rem] font-normal"}
            >
              <FolderGit2
                size={14}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Groups
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={"groups"} className={"flex-1 min-h-0 m-0 p-0"}>
          {/* Virtualized (react-virtuoso) — accounts with many groups render
              only the visible slice. */}
          {groupRows.length > 0 ? (
            <MemoizedScrollArea withoutViewport={true} className={"h-full"}>
              <Virtuoso
                // Remount per peer: Virtuoso keeps its scroll offset across
                // data swaps — switching peers would land mid-list.
                key={`${peerId}-groups`}
                data={groupRows}
                overscan={300}
                defaultItemHeight={54}
                computeItemKey={(index) => groupRef(groupRows[index])}
                itemContent={(index, g) => (
                  <div className={cn("px-3 pb-0.5", index === 0 && "pt-3")}>
                    <MemberRow
                      checked={selectedRefs.has(groupRef(g))}
                      onToggle={peer ? () => toggleGroup(g) : undefined}
                    >
                      <div className={"flex items-center gap-2 pl-2 py-0.5"}>
                        <div
                          className={
                            "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"
                          }
                        >
                          <GroupBadgeIcon
                            id={g.id}
                            issued={g.issued}
                            size={14}
                          />
                        </div>
                        <div
                          className={
                            "flex flex-col gap-0.5 justify-center leading-tight min-w-0"
                          }
                        >
                          <span
                            className={
                              "text-xs text-nb-gray-100 flex items-center gap-2"
                            }
                          >
                            <span className={"truncate max-w-[240px]"}>
                              {g.name}
                            </span>
                            {!g.id && <SmallBadge />}
                          </span>
                          <span className={"text-[0.72rem] text-nb-gray-400"}>
                            {getGroupCountLabel(g)}
                          </span>
                        </div>
                      </div>
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
                  ? "There are no groups matching your search. Please try a different search term."
                  : "There are no groups yet."}
              </DropdownInfoText>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fixed footer — same as the group panel. */}
      <div
        className={
          "shrink-0 border-t border-nb-gray-910 px-5 py-4 flex items-center justify-between"
        }
      >
        <span className={"text-xs text-nb-gray-400"}>
          {`${selectedRefs.size} of ${allGroups.length} Assigned`}
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
            onClick={() => void saveAssignments()}
          >
            {saving ? "Saving..." : isDraft ? "Assign" : "Save"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
