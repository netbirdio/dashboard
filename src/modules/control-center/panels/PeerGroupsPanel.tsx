import Button from "@components/Button";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { notify } from "@components/Notification";
import { MemoizedScrollArea } from "@components/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import { FolderGit2, Loader2, SearchIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import {
  canEditGroupMembers,
  MemberRow,
  PanelVirtuosoScroller,
  setEquals,
  usePanelCloseGuard,
  usePanelPlacement,
  usePanelWidth,
} from "@/modules/control-center/panels/DestinationGroupPanel";
import {
  getGroupCountLabel,
  getPlaceholderPeer,
  pinByOrder,
  useStructuralNodes,
} from "@/modules/control-center/utils/helpers";

interface PeerGroupsPanelProps {
  // Real peer id; empty means closed.
  peerId: string;
  onClose: () => void;
}

// Draft-created groups have no API id, so they key by name.
const groupRef = (g: Group) => g.id ?? g.name;

export const PeerGroupsPanel = ({ peerId, onClose }: PeerGroupsPanelProps) => {
  const { peers, groups } = useControlCenterData();
  const nodes = useStructuralNodes();
  const { isDraft } = useDraftMode();
  const { permission } = usePermissions();
  // Gated PER TARGET: the list mixes existing groups (groups.update) with
  // draft-created ones (groups.create).
  const canEditGroup = (g: Group) => canEditGroupMembers(permission.groups, g);
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
      // Placeholder peers aren't in the API list; resolve them from their canvas node.
      getPlaceholderPeer(nodes.find((n) => n.id === `peer-${peerId}`)),
    [peers, peerId, nodes],
  );

  const allGroups = useMemo(() => {
    const draftGroups: Group[] = isDraft
      ? changes
          .filter((c) => c.type === "create-group")
          .map((c) => ({ name: (c as { name: string }).name }) as Group)
      : [];
    return [...(groups ?? []), ...draftGroups].filter((g) => !isAllGroup(g));
  }, [groups, changes, isDraft]);
  const canEditAnyGroup = allGroups.some(canEditGroup);

  const assignedRefs = useMemo(() => {
    const assigned = new Set<string>();
    // "All" is excluded from the list, so it must not count as assigned either.
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

  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelectedRefs(new Set(assignedKey ? assignedKey.split(",") : []));
  }, [peerId, assignedKey]);

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
    if (!peer?.id || !canEditAnyGroup) return;
    // Narrowed once here; the async IIFE below re-widens peer.id otherwise.
    const peerId = peer.id;
    const added = allGroups.filter(
      (g) => selectedRefs.has(groupRef(g)) && !assignedRefs.has(groupRef(g)),
    );
    const removed = allGroups.filter(
      (g) => !selectedRefs.has(groupRef(g)) && assignedRefs.has(groupRef(g)),
    );

    if (isDraft) {
      added.forEach((g) => {
        // Groups on the canvas get counts and member sets; off-canvas ones only changeset.
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

    const choice = await confirm({
      title: `Save groups of “${peer.name}”?`,
      description:
        "You are in live mode. Saving your changes will apply them to your account immediately.",
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
            // The API rejects resources sent as id strings.
            resources: full.resources,
          },
          `/${full.id}`,
        );
      }
      // /policies embeds the group member counts the views rebuild from.
      await Promise.all([
        mutate("/groups"),
        mutate("/peers"),
        mutate("/policies"),
      ]);
    })();
    // useApiCall rejects but never toasts, so the promise drives the toast.
    notify({
      title: peer.name ?? "Peer",
      description: `Groups of ${peer.name ?? "the peer"} were successfully saved.`,
      promise: request,
    });
    try {
      await request;
      onClose();
    } catch {
      // A PUT in the loop may have partially applied, so re-sync to the server truth.
      await Promise.all([
        mutate("/groups"),
        mutate("/peers"),
        mutate("/policies"),
      ]).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, [peerId]);
  const query = search.trim().toLowerCase();

  const groupCandidates = useMemo(
    () => [
      ...allGroups.filter((g) => assignedRefs.has(groupRef(g))),
      ...allGroups.filter((g) => !assignedRefs.has(groupRef(g))),
    ],
    [allGroups, assignedRefs],
  );

  // Row order frozen per open: the post-save mutate can return the groups reordered.
  const [rowOrder, setRowOrder] = useState<string[] | null>(null);
  useEffect(() => {
    setRowOrder(null);
  }, [peerId]);
  useEffect(() => {
    if (rowOrder || !peerId || !groups) return;
    setRowOrder(groupCandidates.map((g) => groupRef(g)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groupCandidates is snapshotted once, not tracked
  }, [rowOrder, peerId, groups]);

  const groupRows = useMemo(() => {
    const pinned = rowOrder
      ? pinByOrder(groupCandidates, rowOrder, (g) => groupRef(g))
      : groupCandidates;
    if (!query) return pinned;
    return pinned.filter((g) => g.name?.toLowerCase().includes(query));
  }, [groupCandidates, rowOrder, query]);

  const placement = usePanelPlacement({
    openKey: peerId,
    panelWidth,
    top: 80,
    bottom: 24,
  });

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
  const requestClose = usePanelCloseGuard(peerId, confirmDiscard, onClose);

  if (!peerId || !placement) return null;

  return (
    // No key: switching peers must not replay the entry animation.
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
          {groupRows.length > 0 ? (
            <MemoizedScrollArea withoutViewport={true} className={"h-full"}>
              <Virtuoso
                // Virtuoso keeps its scroll offset across data swaps.
                key={`${peerId}-groups`}
                data={groupRows}
                overscan={300}
                defaultItemHeight={54}
                computeItemKey={(index) => groupRef(groupRows[index])}
                itemContent={(index, g) => (
                  <div className={cn("px-3 pb-0.5", index === 0 && "pt-3")}>
                    <MemberRow
                      checked={selectedRefs.has(groupRef(g))}
                      onToggle={
                        peer && canEditGroup(g)
                          ? () => toggleGroup(g)
                          : undefined
                      }
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

      {canEditAnyGroup && (
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
              className={"relative py-2.5"}
              disabled={!dirty || saving}
              onClick={() => void saveAssignments()}
            >
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
