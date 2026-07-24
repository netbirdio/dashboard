import * as React from "react";
import {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { cn, singularize } from "@utils/helpers";
import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import {
  BotIcon,
  FolderGit2,
  WorkflowIcon,
  GripVerticalIcon,
  LucideIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PlusIcon,
  ServerIcon,
  ShieldIcon,
  TextSearchIcon,
} from "lucide-react";
import TruncatedText from "@components/ui/TruncatedText";
import { MemoizedScrollArea, ScrollAreaViewport } from "@components/ScrollArea";
import { Virtuoso } from "react-virtuoso";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { DropdownInput } from "@components/DropdownInput";
import FullTooltip from "@components/FullTooltip";
import {
  OnDropAction,
  useDragAndDrop,
  useDragAndDropPosition,
} from "@/modules/control-center/DragAndDropProvider";
import { XYPosition } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  getDraftResource,
  useStructuralNodes,
  getIpPlaceholderFromRange,
  getPlaceholderPeer,
  getPoliciesTargetingResources,
  getGroupCountLabel,
  getPolicyProtocolAndPortText,
} from "@/modules/control-center/utils/helpers";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useAccount } from "@/modules/account/useAccount";
import {
  getNodeGroup,
  isGroupNode,
  isNewGroup,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { SmallBadge } from "@components/ui/SmallBadge";

// Draggable "create new" templates that drop a blank node onto the canvas.
type BlankKind = "group" | "network" | "resource";

// Draggable "create new" peer templates — all drop a placeholder node onto
// the canvas. Server/Agent placeholders carry an Install button; the User
// Device placeholder is a select node (pick an existing peer or install).
type PeerTemplate = {
  key: PeerPlaceholderKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

const PEER_TEMPLATES: PeerTemplate[] = [
  {
    key: "user-device",
    label: "User Device",
    description: "Install on a computer or phone",
    icon: MonitorSmartphoneIcon,
  },
  {
    key: "server",
    label: "Server",
    description: "Install on a server or VM",
    icon: ServerIcon,
  },
  {
    key: "agent",
    label: "Agent",
    description: "Add an automated or ephemeral peer",
    icon: BotIcon,
  },
];

const BLANK_TEMPLATES: {
  kind: BlankKind;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    kind: "group",
    label: "Group",
    description: "Group peers and resources together",
    icon: FolderGit2,
  },
  {
    kind: "network",
    label: "Network",
    description: "Give access to a private network",
    icon: NetworkIcon,
  },
  {
    kind: "resource",
    label: "Resource",
    description: "A host subnet or domain in a network",
    icon: WorkflowIcon,
  },
];

type GhostData = {
  html: string;
  width: number;
  offsetX: number;
  offsetY: number;
  initialX: number;
  initialY: number;
};

// Bridges Virtuoso's scroll container into the styled ScrollArea viewport
// (same pattern as VirtualScrollAreaList / PeerSelector).
const VirtuosoScroller = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <ScrollAreaViewport ref={ref} {...props} />);
VirtuosoScroller.displayName = "VirtuosoScroller";

type FlatRow =
  | { key: string; kind: "heading"; title: string }
  | { key: string; kind: "row"; node: React.ReactNode };

type PanelCategory = "peers" | "policies" | "groups" | "resources";

const CATEGORIES: {
  id: PanelCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "peers", label: "Peers", icon: MonitorSmartphoneIcon },
  { id: "policies", label: "Policies", icon: ShieldIcon },
  { id: "groups", label: "Groups", icon: FolderGit2 },
  { id: "resources", label: "Networks & Resources", icon: NetworkIcon },
];

export const ControlCenterComponentsPanel = () => {
  const { isDraft, componentsPanelOpen, setComponentsPanelOpen } =
    useDraftMode();

  // Stays mounted for the whole draft session — opening only toggles
  // visibility, so there is no mount cost while the animation runs.
  if (!isDraft) return null;

  return (
    <PanelContent
      open={componentsPanelOpen}
      onClose={() => setComponentsPanelOpen(false)}
    />
  );
};

const PanelContent = React.memo(
  ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<PanelCategory>("peers");
    const isSearching = search.trim().length > 0;
    const searchRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // autoFocus only fires on mount — focus explicitly on every open.
    // Closing clears the search so the panel reopens fresh, and releases
    // focus back to the canvas — the panel only hides, so a still-focused
    // search input would keep swallowing the canvas shortcuts.
    React.useEffect(() => {
      if (open) {
        searchRef.current?.focus();
        return;
      }
      setSearch("");
      if (panelRef.current?.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    }, [open]);

    useControlCenterShortcuts({ Escape: onClose }, open);
    const { onDragStart, isDragging } = useDragAndDrop();
    const [ghostData, setGhostData] = useState<GhostData>();
    const {
      placeNode: placeDroppedNode,
      addPeerPlaceholder,
      addBlankNode: addBlankPlaceholderNode,
      addResourceToFrame,
      addBlankPolicy,
      dropExistingNetworkFrame,
    } = useDraftNodeCreation();
    // Declared before addNode (which references them) to avoid a TDZ in its deps.
    const { data: networks } = useFetchApi<Network[]>("/networks");
    const { data: resources } = useFetchApi<NetworkResource[]>(
      "/networks/resources",
    );
    const { data: policies } = useFetchApi<Policy[]>("/policies");
    const { changes } = useDraftChangeset();

    const handlePeerTemplateDragStart = useCallback(
      (event: React.PointerEvent<HTMLDivElement>, tpl: PeerTemplate) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        setGhostData({
          html: el.outerHTML,
          width: rect.width,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          initialX: event.clientX,
          initialY: event.clientY,
        });
        onDragStart(event, ({ position }) => {
          addPeerPlaceholder(tpl.key, position);
          setGhostData(undefined);
          onClose();
        });
      },
      [onDragStart, addPeerPlaceholder, onClose],
    );

    const { addNewGroup } = useDraftGroupActions();
    const { drawPolicyOnCanvas } = useControlCenterPolicy();

    // Existing policy: draw it with its sources/destinations — nodes already on
    // the canvas are connected, missing ones are created around the drop point.
    // A pending update-policy change wins over the API data, so a policy edited
    // or disconnected in this draft (e.g. Remove emptied its sides) comes back
    // in its draft state, not its deployed one.
    const handleExistingPolicyDrop = useCallback(
      (policy: Policy, position?: XYPosition) => {
        const pending = changes.find(
          (c) => c.type === "update-policy" && c.policyId === policy.id,
        );
        const draftPolicy =
          pending?.type === "update-policy" ? pending.policy : policy;
        drawPolicyOnCanvas(draftPolicy, position);
      },
      [drawPolicyOnCanvas, changes],
    );

    // Mirror of the existing-policy drop for existing networks/resources:
    // the policies granting access to the dropped resources are drawn too
    // (sources created/connected around an anchor left of the drop point).
    const drawResourcePolicies = useCallback(
      (droppedResources: NetworkResource[], position?: XYPosition) => {
        // Pending update-policy changes win over API data (see
        // handleExistingPolicyDrop) — a policy disconnected in this draft
        // doesn't get re-drawn with its deployed sides.
        const draftPolicies = (policies ?? []).map((p) => {
          const pending = changes.find(
            (c) => c.type === "update-policy" && c.policyId === p.id,
          );
          return pending?.type === "update-policy" ? pending.policy : p;
        });
        const related = getPoliciesTargetingResources(
          droppedResources,
          draftPolicies,
        );
        if (related.length === 0) return;
        // Next tick — the dropped nodes must be committed to the canvas
        // before drawPolicyOnCanvas connects the policies' edges to them.
        setTimeout(() => {
          related.forEach((policy, i) => {
            const anchor = position
              ? { x: position.x - 500, y: position.y + i * 140 }
              : undefined;
            drawPolicyOnCanvas(policy, anchor);
          });
        }, 0);
      },
      [policies, changes, drawPolicyOnCanvas],
    );

    const handlePolicyDragStart = useCallback(
      (event: React.PointerEvent<HTMLDivElement>, policy?: Policy) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        setGhostData({
          html: el.outerHTML,
          width: rect.width,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          initialX: event.clientX,
          initialY: event.clientY,
        });
        onDragStart(event, ({ position }) => {
          // New-policy template drops a blank policy node — no modal; it
          // becomes a changeset entry once connects give it both sides.
          if (policy) handleExistingPolicyDrop(policy, position);
          else addBlankPolicy(position);
          setGhostData(undefined);
          onClose();
        });
      },
      [onDragStart, handleExistingPolicyDrop, addBlankPolicy, onClose],
    );

    // Drops a fresh, id-less "new" node so the node components render their
    // NEW badge. Each drop gets a unique canvas id so multiple blanks coexist.
    // Groups go through addNewGroup: unique "New Group (n)" name, tracked in
    // the draft changeset, group panel opened for immediate renaming.
    const addBlankNode = useCallback(
      (kind: BlankKind, position?: XYPosition, targetNodeId?: string) => {
        if (kind === "group") {
          const pos = position
            ? { x: position.x - 100, y: position.y - 30 }
            : { x: 0, y: 0 };
          addNewGroup(pos);
          return;
        }
        // A resource dropped onto a network frame is added INTO it; otherwise
        // it lands as a standalone "No Network" card. (targetNodeId is already
        // resolved to the frame id by the drop provider; every network- node on
        // the draft canvas is a frame.)
        if (kind === "resource" && targetNodeId?.startsWith("network-")) {
          addResourceToFrame(targetNodeId);
          return;
        }
        addBlankPlaceholderNode(kind, position);
      },
      [addBlankPlaceholderNode, addResourceToFrame, addNewGroup],
    );

    const handleBlankDragStart = useCallback(
      (event: React.PointerEvent<HTMLDivElement>, kind: BlankKind) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        setGhostData({
          html: el.outerHTML,
          width: rect.width,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          initialX: event.clientX,
          initialY: event.clientY,
        });
        onDragStart(
          event,
          ({ position, targetNodeId }) => {
            addBlankNode(kind, position, targetNodeId);
            setGhostData(undefined);
            onClose();
          },
          { canDropIntoFrame: kind === "resource" },
        );
      },
      [onDragStart, addBlankNode, onClose],
    );

    const addNode = useCallback(
      (
        type: NodeType,
        data: Peer | Group | NetworkResource | Network,
        position?: XYPosition,
      ) => {
        // Existing networks drop as a full frame (chrome + existing resources
        // as children), reusing the draft-frame machinery — plus the policies
        // that grant access to its resources.
        if (type === NodeType.NetworkNode) {
          const network = data as Network;
          dropExistingNetworkFrame(network, position);
          const childResources = (resources ?? []).filter((r) =>
            network.resources?.includes(r.id ?? ""),
          );
          drawResourcePolicies(childResources, position);
          return;
        }

        let nodeData: any;
        let nodeId: string;

        if (type === NodeType.PeerNode) {
          nodeData = {
            peer: data as Peer,
            enabled: true,
            showHandles: true,
            variant: "card",
          };
          nodeId = `peer-${data.id}`;
        } else if (type === NodeType.GroupNode) {
          nodeData = { group: data as Group, enabled: true, showHandles: true };
          nodeId = `group-${data.id}`;
        } else if (type === NodeType.ResourceNode) {
          // Existing resources already live in a network — stamp its ref so
          // the standalone card shows the network name (read-only in v1).
          const resourceData = data as NetworkResource;
          const network = networks?.find((n) =>
            n.resources?.some((r) => r === resourceData.id),
          );
          nodeData = {
            resource: resourceData,
            enabled: true,
            showHandles: true,
            draftNetwork: network
              ? { networkId: network.id, name: network.name }
              : undefined,
          };
          nodeId = `resource-${data.id}`;
        }

        placeDroppedNode(
          {
            id: nodeId!,
            type: type,
            data: nodeData,
            position: { x: 0, y: 0 },
          },
          position,
        );

        // Existing resources also pull in the policies granting access to
        // them (directly or via their groups).
        if (type === NodeType.ResourceNode) {
          drawResourcePolicies([data as NetworkResource], position);
        }
      },
      [
        placeDroppedNode,
        networks,
        resources,
        dropExistingNetworkFrame,
        drawResourcePolicies,
      ],
    );

    const createDropHandler = useCallback(
      (
        type: NodeType,
        data: Peer | Group | NetworkResource | Network,
      ): OnDropAction => {
        return ({ position }) => {
          addNode(type, data, position);
          setGhostData(undefined);
          onClose();
        };
      },
      [addNode, onClose],
    );

    const handleDragStart = useCallback(
      (
        event: React.PointerEvent<HTMLDivElement>,
        type: NodeType,
        data: Peer | Group | NetworkResource | Network,
      ) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        setGhostData({
          html: el.outerHTML,
          width: rect.width,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          initialX: event.clientX,
          initialY: event.clientY,
        });
        onDragStart(event, createDropHandler(type, data));
      },
      [onDragStart, createDropHandler],
    );

    const { data: peers } = useFetchApi<Peer[]>("/peers");
    const { data: groups } = useFetchApi<Group[]>("/groups");

    // Structural subscription (ids/data/parentId; never positions) — the
    // canvas context re-rendered this whole list on every drag tick.
    const canvasNodes = useStructuralNodes();
    const account = useAccount();
    const canvasNodeIds = useMemo(
      () => new Set(canvasNodes.map((n) => n.id)),
      [canvasNodes],
    );

    // Groups marked for deletion in the draft can't be re-added — they'd be
    // gone right after deploy.
    const pendingDeleteGroupIds = useMemo(
      () =>
        new Set(
          changes
            .filter((c) => c.type === "delete-group")
            .map((c) => (c.type === "delete-group" ? c.groupId : "")),
        ),
      [changes],
    );

    // A category word ("peer"/"peers", "group"/"groups", …) reveals the whole
    // matching section (all items + create templates), not just name matches.
    const categoryMatch = useCallback(
      (keywords: string[]) => {
        const s = search.trim().toLowerCase();
        if (!s) return false;
        return keywords.some((k) => k.includes(s) || s.includes(k));
      },
      [search],
    );
    const peersCategory = categoryMatch(["peer", "peers", "device", "devices"]);
    const resourcesCategory = categoryMatch([
      "resource",
      "resources",
      "network",
      "networks",
    ]);
    const groupsCategory = categoryMatch(["group", "groups"]);
    const networksCategory = categoryMatch(["network", "networks"]);
    const policiesCategory = categoryMatch(["policy", "policies", "access"]);

    const filteredPeers = useMemo(() => {
      if (!peers) return [];
      if (!search || peersCategory) return peers;
      const lower = search.toLowerCase();
      return peers.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.ip?.toLowerCase().includes(lower) ||
          p.hostname?.toLowerCase().includes(lower),
      );
    }, [peers, search, peersCategory]);

    const filteredResources = useMemo(() => {
      if (!resources) return [];
      if (!search || resourcesCategory) return resources;
      const lower = search.toLowerCase();
      return resources.filter(
        (r) =>
          r.name?.toLowerCase().includes(lower) ||
          r.address?.toLowerCase().includes(lower),
      );
    }, [resources, search, resourcesCategory]);

    const filteredGroups = useMemo(() => {
      if (!groups) return [];
      if (!search || groupsCategory) return groups;
      const lower = search.toLowerCase();
      return groups.filter((g) => g.name?.toLowerCase().includes(lower));
    }, [groups, search, groupsCategory]);

    const filteredPolicies = useMemo(() => {
      if (!policies) return [];
      if (!search || policiesCategory) return policies;
      const lower = search.toLowerCase();
      return policies.filter((p) => p.name?.toLowerCase().includes(lower));
    }, [policies, search, policiesCategory]);

    // Groups that only exist in the draft (dropped onto the canvas, not created
    // yet) — listed with a NEW badge so the panel reflects them immediately.
    const draftGroups = useMemo(() => {
      const seen = new Set<string>();
      const result: { nodeId: string; group: Group }[] = [];
      canvasNodes.forEach((n) => {
        const group = getNodeGroup(n);
        if (!isGroupNode(n) || !group || !isNewGroup(group)) return;
        if (seen.has(group.name)) return;
        seen.add(group.name);
        result.push({ nodeId: n.id, group });
      });
      if (!search || groupsCategory) return result;
      const lower = search.toLowerCase();
      return result.filter((r) => r.group.name.toLowerCase().includes(lower));
    }, [canvasNodes, search, groupsCategory]);

    // Resources created in this draft — listed with a NEW badge, disabled
    // (they're already on the canvas by construction).
    const draftResources = useMemo(() => {
      const result: { nodeId: string; resource: NetworkResource }[] = [];
      canvasNodes.forEach((n) => {
        const resource = getDraftResource(n);
        if (resource) result.push({ nodeId: n.id, resource });
      });
      if (!search || resourcesCategory) return result;
      const lower = search.toLowerCase();
      return result.filter((r) =>
        r.resource.name.toLowerCase().includes(lower),
      );
    }, [canvasNodes, search, resourcesCategory]);

    // Placeholder peers dropped in this draft (Server / Agent / User
    // Device) — NEW badge, disabled (already on canvas by construction).
    const draftPeers = useMemo(() => {
      const result: { nodeId: string; peer: Peer }[] = [];
      canvasNodes.forEach((n) => {
        const peer = getPlaceholderPeer(n);
        if (peer) result.push({ nodeId: n.id, peer });
      });
      if (!search || peersCategory) return result;
      const lower = search.toLowerCase();
      return result.filter((r) => r.peer.name.toLowerCase().includes(lower));
    }, [canvasNodes, search, peersCategory]);

    // Draft-created policies — NEW badge, disabled.
    const draftPolicies = useMemo(() => {
      const seen = new Set<string>();
      const result: { nodeId: string; policy: Policy }[] = [];
      canvasNodes.forEach((n) => {
        if (n.type !== "policyNode") return;
        const policy = (n.data as { policy?: Policy })?.policy;
        if (!policy?.id || !String(policy.id).startsWith("new-")) return;
        if (seen.has(policy.id)) return;
        seen.add(policy.id);
        result.push({ nodeId: n.id, policy });
      });
      if (!search || policiesCategory) return result;
      const lower = search.toLowerCase();
      return result.filter((r) =>
        (r.policy.name ?? "").toLowerCase().includes(lower),
      );
    }, [canvasNodes, search, policiesCategory]);

    const filteredNetworks = useMemo(() => {
      if (!networks) return [];
      if (!search || resourcesCategory) return networks;
      const lower = search.toLowerCase();
      return networks.filter((n) => n.name.toLowerCase().includes(lower));
    }, [networks, search, resourcesCategory]);

    // Networks created in this draft (frames) — NEW badge, disabled.
    const draftNetworks = useMemo(() => {
      const result: {
        nodeId: string;
        name: string;
        resourceCount: number;
      }[] = [];
      canvasNodes.forEach((n) => {
        if (!n.id.startsWith("network-new-")) return;
        const name = (n.data as { network?: { name?: string } })?.network
          ?.name;
        if (!name) return;
        result.push({
          nodeId: n.id,
          name,
          resourceCount: canvasNodes.filter(
            (c) => c.parentId === n.id && c.id.startsWith("resource-"),
          ).length,
        });
      });
      if (!search || resourcesCategory) return result;
      const lower = search.toLowerCase();
      return result.filter((r) => r.name.toLowerCase().includes(lower));
    }, [canvasNodes, search, resourcesCategory]);

    const matchesSearch = useCallback(
      (label: string) =>
        !search || label.toLowerCase().includes(search.toLowerCase()),
      [search],
    );
    const filteredPeerTemplates = useMemo(
      () =>
        PEER_TEMPLATES.filter((t) => peersCategory || matchesSearch(t.label)),
      [matchesSearch, peersCategory],
    );
    const groupTemplates = useMemo(
      () =>
        BLANK_TEMPLATES.filter(
          (t) =>
            t.kind === "group" && (groupsCategory || matchesSearch(t.label)),
        ),
      [matchesSearch, groupsCategory],
    );
    const resourceTemplates = useMemo(
      () =>
        BLANK_TEMPLATES.filter(
          (t) =>
            (t.kind === "resource" &&
              (resourcesCategory || matchesSearch(t.label))) ||
            (t.kind === "network" &&
              (networksCategory || matchesSearch(t.label))),
        ),
      [matchesSearch, resourcesCategory, networksCategory],
    );
    const showPolicyTemplate = policiesCategory || matchesSearch("Policy");

    // ---- Row builders (shared between category pages and search results) ----

    const buildPeerTemplateRows = () =>
      filteredPeerTemplates.map((tpl) => (
        <TemplateItem
          key={tpl.key}
          icon={tpl.icon}
          label={tpl.label}
          description={tpl.description}
          draggable
          onPointerDown={(e) => handlePeerTemplateDragStart(e, tpl)}
        />
      ));

    const buildPolicyTemplateRows = () =>
      showPolicyTemplate
        ? [
            <TemplateItem
              key={"policy-template"}
              icon={ShieldIcon}
              label={"Policy"}
              description={"Control access between sources and destinations"}
              draggable
              onPointerDown={(e) => handlePolicyDragStart(e)}
            />,
          ]
        : [];

    const buildGroupTemplateRows = () =>
      groupTemplates.map((tpl) => (
        <TemplateItem
          key={tpl.kind}
          icon={tpl.icon}
          label={tpl.label}
          description={tpl.description}
          draggable
          onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
        />
      ));

    const buildResourceTemplateRows = () =>
      resourceTemplates.map((tpl) => (
        <TemplateItem
          key={tpl.kind}
          icon={tpl.icon}
          label={tpl.label}
          description={tpl.description}
          draggable
          onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
        />
      ));

    const buildPeerRows = () =>
      filteredPeers.map((peer) => {
        const onCanvas = canvasNodeIds.has(`peer-${peer.id}`);
        return (
          <PanelListItem
            key={peer.id}
            disabled={onCanvas}
            onCanvas={onCanvas}
            onPointerDown={(e) => handleDragStart(e, NodeType.PeerNode, peer)}
          >
            <DeviceCard device={peer} size="small" className="flex-1" />
          </PanelListItem>
        );
      });

    const buildDraftPeerRows = () =>
      draftPeers.map(({ nodeId, peer }) => (
        <PanelListItem key={nodeId} disabled onCanvas>
          <DeviceCard
            // Same dimmed IP placeholder as the canvas card — assigned on
            // install, derived from the account's peer network range.
            device={{
              ...peer,
              ip: getIpPlaceholderFromRange(account?.settings?.network_range),
            }}
            size="small"
            className="flex-1"
            badge={<SmallBadge />}
          />
        </PanelListItem>
      ));

    const buildDraftPolicyRows = () =>
      draftPolicies.map(({ nodeId, policy }) => {
        const protocolLabel = getPolicyProtocolAndPortText(policy);
        return (
          <PanelListItem key={nodeId} disabled onCanvas>
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
              <div
                className={
                  "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
                }
              >
                <ShieldIcon size={14} />
              </div>
              <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
                <span
                  className={
                    "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                  }
                >
                  <TruncatedText
                    text={policy.name ?? "Policy"}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                  <SmallBadge />
                </span>
                <span className={"text-[0.7rem] text-nb-gray-400 truncate"}>
                  {protocolLabel || "All"}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    const buildDraftNetworkRows = () =>
      draftNetworks.map(({ nodeId, name, resourceCount }) => (
        <PanelListItem key={nodeId} disabled onCanvas>
          <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
            <div
              className={
                "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
              }
            >
              <NetworkIcon size={14} />
            </div>
            <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
              <span
                className={
                  "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                }
              >
                <TruncatedText
                  text={name}
                  maxWidth={"150px"}
                  hideTooltip={true}
                />
                <SmallBadge />
              </span>
              <span className={"text-[0.7rem] text-nb-gray-400 truncate"}>
                {singularize("Resources", resourceCount, true)}
              </span>
            </div>
          </div>
        </PanelListItem>
      ));

    const buildNetworkRows = () =>
      filteredNetworks.map((network) => {
        const onCanvas = canvasNodeIds.has(`network-${network.id}`);
        return (
          <PanelListItem
            key={network.id}
            disabled={onCanvas}
            onCanvas={onCanvas}
            onPointerDown={(e) =>
              handleDragStart(e, NodeType.NetworkNode, network)
            }
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
              <div
                className={
                  "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
                }
              >
                <NetworkIcon size={14} />
              </div>
              <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
                <span
                  className={
                    "text-xs text-nb-gray-100 flex items-center min-w-0"
                  }
                >
                  <TruncatedText
                    text={network.name}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                </span>
                <span className={"text-[0.7rem] text-nb-gray-400 truncate"}>
                  {singularize("Resources", network.resources?.length ?? 0, true)}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    const buildResourceRows = () =>
      filteredResources.map((resource) => {
        const onCanvas = canvasNodeIds.has(`resource-${resource.id}`);
        // Existing resources already live in a network — show "name - network"
        // (like the global search) and, since v1 doesn't reassign existing
        // resources, they must NOT drop into another network frame.
        const network = networks?.find((n) =>
          n.resources?.some((r) => r === resource.id),
        );
        const displayResource = network
          ? { ...resource, name: `${resource.name} - ${network.name}` }
          : resource;
        return (
          <PanelListItem
            key={resource.id}
            disabled={onCanvas}
            onCanvas={onCanvas}
            onPointerDown={(e) =>
              handleDragStart(e, NodeType.ResourceNode, resource)
            }
          >
            <DeviceCard
              resource={displayResource}
              size="small"
              className="flex-1"
            />
          </PanelListItem>
        );
      });

    const buildDraftResourceRows = () =>
      draftResources.map(({ nodeId, resource }) => (
        <PanelListItem key={nodeId} disabled onCanvas>
          <DeviceCard
            resource={resource}
            size="small"
            className="flex-1"
            badge={<SmallBadge />}
          />
        </PanelListItem>
      ));

    const buildDraftGroupRows = () =>
      draftGroups.map(({ nodeId, group }) => (
        <PanelListItem key={nodeId} disabled onCanvas>
          <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
            <div
              className={
                "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
              }
            >
              <GroupBadgeIcon size={14} />
            </div>
            <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
              <span
                className={
                  "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                }
              >
                <TruncatedText
                  text={group.name}
                  maxWidth={"150px"}
                  hideTooltip={true}
                />
                <SmallBadge />
              </span>
              <span className={"text-[0.7rem] text-nb-gray-400"}>
                {getGroupCountLabel(group)}
              </span>
            </div>
          </div>
        </PanelListItem>
      ));

    const buildGroupRows = () =>
      filteredGroups.map((group) => {
        const pendingDelete = pendingDeleteGroupIds.has(group.id ?? "");
        const onCanvas = canvasNodeIds.has(`group-${group.id}`);
        return (
          <PanelListItem
            key={group.id}
            disabled={onCanvas || pendingDelete}
            onCanvas={onCanvas}
            onPointerDown={(e) => handleDragStart(e, NodeType.GroupNode, group)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
              <div
                className={
                  "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
                }
              >
                <GroupBadgeIcon id={group.id} issued={group.issued} size={14} />
              </div>
              <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
                <span
                  className={
                    "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                  }
                >
                  <TruncatedText
                    text={group.name}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                  {pendingDelete && (
                    <span
                      className={
                        "text-[0.55rem] leading-none px-1 py-[0.3rem] rounded-[3px] bg-red-900/40 border border-red-500/20 text-red-400"
                      }
                    >
                      DELETED
                    </span>
                  )}
                </span>
                <span className={"text-[0.7rem] text-nb-gray-400"}>
                  {getGroupCountLabel(group)}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    const buildPolicyRows = () =>
      filteredPolicies.map((policy) => {
        const protocolLabel = getPolicyProtocolAndPortText(policy);
        const onCanvas = canvasNodeIds.has(`policy-${policy.id}`);
        return (
          <PanelListItem
            key={policy.id}
            disabled={onCanvas}
            onCanvas={onCanvas}
            onPointerDown={(e) => handlePolicyDragStart(e, policy)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
              <div
                className={
                  "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
                }
              >
                <ShieldIcon size={14} />
              </div>
              <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
                <span
                  className={
                    "text-xs text-nb-gray-100 flex items-center min-w-0"
                  }
                >
                  <TruncatedText
                    text={policy.name}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                </span>
                <span className={"text-[0.7rem] text-nb-gray-400 truncate"}>
                  {/* Same fallback as PolicyNode: empty label = all protocols */}
                  {protocolLabel || "All"}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    // While searching, results span every category; otherwise the rail
    // decides. Create-new templates always live in their own "Add New"
    // section so they're clearly separated from existing entities. Rows are
    // built lazily — only for the visible view — so opening the panel
    // doesn't render every entity list up front.
    const sections: { title?: string; rows: React.ReactNode[] }[] = (
      isSearching
        ? [
            {
              title: "Add New",
              rows: [
                ...buildPeerTemplateRows(),
                ...buildPolicyTemplateRows(),
                ...buildGroupTemplateRows(),
                ...buildResourceTemplateRows(),
              ],
            },
            {
              title: "Peers",
              rows: [...buildDraftPeerRows(), ...buildPeerRows()],
            },
            {
              title: "Policies",
              rows: [...buildDraftPolicyRows(), ...buildPolicyRows()],
            },
            {
              title: "Groups",
              rows: [...buildDraftGroupRows(), ...buildGroupRows()],
            },
            {
              title: "Networks",
              rows: [...buildDraftNetworkRows(), ...buildNetworkRows()],
            },
            {
              title: "Resources",
              rows: [...buildDraftResourceRows(), ...buildResourceRows()],
            },
          ]
        : category === "peers"
        ? [
            { title: "Add New", rows: buildPeerTemplateRows() },
            {
              title: "Existing Peers",
              rows: [...buildDraftPeerRows(), ...buildPeerRows()],
            },
          ]
        : category === "policies"
        ? [
            { title: "Add New", rows: buildPolicyTemplateRows() },
            {
              title: "Existing Policies",
              rows: [...buildDraftPolicyRows(), ...buildPolicyRows()],
            },
          ]
        : category === "groups"
        ? [
            { title: "Add New", rows: buildGroupTemplateRows() },
            {
              title: "Existing Groups",
              rows: [...buildDraftGroupRows(), ...buildGroupRows()],
            },
          ]
        : [
            { title: "Add New", rows: buildResourceTemplateRows() },
            {
              title: "Existing Networks",
              rows: [...buildDraftNetworkRows(), ...buildNetworkRows()],
            },
            {
              title: "Existing Resources",
              rows: [...buildDraftResourceRows(), ...buildResourceRows()],
            },
          ]
    ).filter((sec) => sec.rows.length > 0);

    // Flattened for virtualization: headings and rows become one list, only
    // the visible slice is rendered (like PeerSelector).
    const flatRows: FlatRow[] = sections.flatMap((section, si) => [
      ...(section.title
        ? [
            {
              key: `heading-${section.title}`,
              kind: "heading" as const,
              title: section.title,
            },
          ]
        : []),
      ...section.rows.map((node, ri) => ({
        key: `${section.title ?? si}-${
          (React.isValidElement(node) && node.key) || ri
        }`,
        kind: "row" as const,
        node,
      })),
    ]);

    return (
      <>
        {isDragging && ghostData && <DragGhost ghost={ghostData} />}
        <motion.div
          ref={panelRef}
          initial={false}
          animate={
            open
              ? { x: "-50%", y: 0, opacity: 1 }
              : { x: "-50%", y: 14, opacity: 0 }
          }
          transition={{ duration: 0.1, ease: "easeOut" }}
          // The global Escape shortcut is input-aware and stays quiet while
          // focus is inside the panel (search input, category buttons) — so
          // Esc is also handled here, where it always reaches us.
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            }
          }}
          className={cn(
            !open && "pointer-events-none",
            // Node picker floating above the bottom toolbar — and above the
            // group panel (z-20), which must never cover it.
            "absolute bottom-[80px] left-1/2 z-30",
            "w-[480px] max-w-[calc(100%-48px)] h-[420px] max-h-[calc(100%-170px)]",
            "border border-nb-gray-910 rounded-lg flex flex-col overflow-hidden",
            "bg-nb-gray-935 shadow-xl",
          )}
        >
          {/* Search — transparent, like the global search */}
          <div
            className={
              "flex items-center gap-2 pr-3 border-b border-nb-gray-910"
            }
          >
            <DropdownInput
              ref={searchRef}
              value={search}
              onChange={
                setSearch as React.ComponentProps<
                  typeof DropdownInput
                >["onChange"]
              }
              placeholder={"Search components, peers, groups, resources..."}
              className={"py-3.5"}
              hideEnterIcon
            />
            {/* ESC badge instead of an X — an X next to the search reads as
                "clear the search"; this closes the whole panel. */}
            <button
              onClick={onClose}
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

          <div className={"flex flex-1 min-h-0"}>
            {/* Category rail — icon only, tooltip on hover */}
            <div
              className={
                "w-[52px] shrink-0 border-r border-nb-gray-910 py-2 flex flex-col items-center gap-1"
              }
            >
              {CATEGORIES.map((cat) => (
                <FullTooltip
                  key={cat.id}
                  content={<span className={"text-xs"}>{cat.label}</span>}
                  side={"left"}
                  sideOffset={14}
                  interactive={false}
                  contentClassName={"!px-2 !py-1.5"}
                  variant={"lighter"}
                >
                  <button
                    onClick={() => {
                      setCategory(cat.id);
                      setSearch("");
                    }}
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                      !isSearching && category === cat.id
                        ? "bg-nb-gray-800 text-nb-gray-100"
                        : "text-nb-gray-400 hover:bg-nb-gray-900/80 hover:text-nb-gray-200",
                    )}
                  >
                    <cat.icon size={15} />
                  </button>
                </FullTooltip>
              ))}
            </div>

            {/* Items — virtualized (react-virtuoso), like PeerSelector */}
            {flatRows.length > 0 ? (
              <MemoizedScrollArea
                withoutViewport={true}
                className={"flex-1 min-h-0"}
              >
                <Virtuoso
                  // The panel stays mounted while closed (it only fades) —
                  // Virtuoso and the scroll area would keep their first,
                  // invisible-mount measurements (wrong scrollbar size, or
                  // none at all). Remount the list on every open for a
                  // fresh measure of the now-visible container. Category /
                  // search-mode changes remount too — Virtuoso keeps its
                  // scroll offset across data swaps, so switching tabs would
                  // otherwise land mid-list at the previous tab's position.
                  key={`${open ? "open" : "closed"}-${
                    isSearching ? "search" : category
                  }`}
                  data={flatRows}
                  overscan={300}
                  // Exact row height (h-[52px]) — headings are shorter and
                  // measured as soon as they render; an overestimate here
                  // inflates the scrollbar until every item was measured
                  // (visibly off on heading-heavy tabs like Networks &
                  // Resources).
                  defaultItemHeight={52}
                  computeItemKey={(index) => flatRows[index].key}
                  itemContent={(index, row) => (
                    <div className={cn("px-2", index === 0 && "pt-2")}>
                      {row.kind === "heading" ? (
                        <div
                          className={
                            "text-[0.7rem] font-medium text-nb-gray-400 uppercase tracking-wider px-3 pt-1.5 pb-1"
                          }
                        >
                          {row.title}
                        </div>
                      ) : (
                        <div className={"pb-0"}>{row.node}</div>
                      )}
                    </div>
                  )}
                  components={{ Scroller: VirtuosoScroller }}
                  style={{ height: "100%" }}
                />
              </MemoizedScrollArea>
            ) : (
              // Same not-found state as the global search modal.
              <div className={"flex-1 flex justify-center pt-8"}>
                <div className={"text-center"}>
                  <div
                    className={"flex items-center justify-center mb-3 gap-3"}
                  >
                    <div
                      className={
                        "bg-nb-gray-920 h-8 w-8 flex items-center justify-center rounded-md"
                      }
                    >
                      <TextSearchIcon size={16} />
                    </div>
                  </div>
                  <div className={"text-nb-gray-100 mb-1"}>
                    Could not find any results
                  </div>
                  <div
                    className={
                      "text-sm text-nb-gray-350 font-light max-w-xs px-6"
                    }
                  >
                    {`We couldn't find any results. Please try a different search term.`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </>
    );
  },
);

PanelContent.displayName = "PanelContent";

const TemplateItem = React.memo(
  ({
    icon: Icon,
    iconNode,
    label,
    description,
    draggable,
    onPointerDown,
    onClick,
  }: {
    icon?: LucideIcon;
    iconNode?: React.ReactNode;
    label: string;
    description?: string;
    draggable?: boolean;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    onClick?: () => void;
  }) => {
    return (
      <div
        onPointerDown={onPointerDown}
        onClick={onClick}
        className={cn(
          "group/item flex items-center h-[52px] rounded-md px-1 transition-colors hover:bg-nb-gray-900/50",
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
          <div
            className={
              "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
            }
          >
            {iconNode ?? (Icon && <Icon size={14} />)}
          </div>
          <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
            <span className={"text-xs text-nb-gray-100"}>{label}</span>
            <span className={"text-[0.7rem] text-nb-gray-400"}>
              {description}
            </span>
          </div>
        </div>
        {draggable ? (
          <GripVerticalIcon
            size={14}
            className="shrink-0 ml-auto mr-3 text-nb-gray-400"
          />
        ) : (
          <PlusIcon
            size={14}
            className="shrink-0 ml-auto mr-3 text-nb-gray-400"
          />
        )}
      </div>
    );
  },
);

TemplateItem.displayName = "TemplateItem";

const PanelListItem = React.memo(
  ({
    children,
    className,
    onPointerDown,
    disabled,
    onCanvas,
  }: PropsWithChildren<{
    className?: string;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    disabled?: boolean;
    onCanvas?: boolean;
  }>) => {
    return (
      <div
        onPointerDown={disabled ? undefined : onPointerDown}
        className={cn(
          "group/item flex items-center h-[52px] rounded-md px-1 transition-colors",
          disabled
            ? "cursor-default"
            : "hover:bg-nb-gray-900/50 cursor-grab active:cursor-grabbing",
          className,
        )}
      >
        {/* Only the entity content dims when disabled — the badge stays
            readable. */}
        <div
          className={cn(
            "flex items-center flex-1 min-w-0",
            disabled && "opacity-40",
          )}
        >
          {children}
        </div>
        {onCanvas ? (
          <span
            className={
              "shrink-0 ml-auto mr-3 text-[0.50rem] leading-none px-1 py-[0.3rem] rounded-[3px] bg-nb-gray-910 border border-nb-gray-800/30 text-nb-gray-350 opacity-70"
            }
          >
            ON CANVAS
          </span>
        ) : (
          !disabled && (
            <GripVerticalIcon
              size={14}
              className="shrink-0 ml-auto mr-3 text-nb-gray-400"
            />
          )
        )}
      </div>
    );
  },
);

PanelListItem.displayName = "PanelListItem";

const DragGhost = ({ ghost }: { ghost: GhostData }) => {
  const { position } = useDragAndDropPosition();
  const ref = useRef<HTMLDivElement>(null);
  const htmlSet = useRef(false);

  const x = (position?.x ?? ghost.initialX) - ghost.offsetX;
  const y = (position?.y ?? ghost.initialY) - ghost.offsetY;

  React.useLayoutEffect(() => {
    if (ref.current && !htmlSet.current) {
      ref.current.innerHTML = ghost.html;
      htmlSet.current = true;
    }
  }, [ghost.html]);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[99] opacity-90"
      style={{
        top: 0,
        left: 0,
        width: ghost.width,
        transform: `translate(${x}px, ${y}px)`,
      }}
    />
  );
};
