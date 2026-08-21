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
  ServerIcon,
  ShieldIcon,
  TextSearchIcon,
} from "lucide-react";
import TruncatedText from "@components/ui/TruncatedText";
import { MemoizedScrollArea, ScrollAreaViewport } from "@components/ScrollArea";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { DropdownInput } from "@components/DropdownInput";
import FullTooltip from "@components/FullTooltip";
import {
  OnDropAction,
  useDragAndDrop,
  useDragAndDropPosition,
} from "@/modules/control-center/contexts/DragAndDropProvider";
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
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useAccount } from "@/modules/account/useAccount";
import {
  getNodeGroup,
  isGroupNode,
  isNewGroup,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { SmallBadge } from "@components/ui/SmallBadge";

type BlankKind = "group" | "network" | "resource";

type PeerTemplate = {
  key: PeerPlaceholderKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

const PEER_TEMPLATES: PeerTemplate[] = [
  {
    key: "server",
    label: "Server",
    description: "Install on a server or VM",
    icon: ServerIcon,
  },
  {
    key: "agent",
    label: "Agent",
    description: "Add an automated or headless peer",
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
  const {
    isDraft,
    componentsPanelOpen,
    setComponentsPanelOpen,
    setResourceEditor,
    drillDownNetworkNodeId,
  } = useDraftMode();

  // A fresh closure here would defeat PanelContent's memo.
  const onClose = useCallback(
    () => setComponentsPanelOpen(false),
    [setComponentsPanelOpen],
  );

  if (!isDraft) return null;

  return (
    <PanelContent
      open={componentsPanelOpen}
      onClose={onClose}
      setResourceEditor={setResourceEditor}
      drillDownNetworkNodeId={drillDownNetworkNodeId}
    />
  );
};

const PanelContent = React.memo(
  ({
    open,
    onClose,
    setResourceEditor,
    drillDownNetworkNodeId,
  }: {
    open: boolean;
    onClose: () => void;
    // A prop, not useDraftMode: this component is always mounted.
    setResourceEditor: ReturnType<typeof useDraftMode>["setResourceEditor"];
    drillDownNetworkNodeId: string | null;
  }) => {
    const drilled = !!drillDownNetworkNodeId;
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<PanelCategory>("peers");
    // Filters compare the trimmed term so a whitespace-only search is a no-op.
    const query = search.trim();
    const isSearching = query.length > 0;
    const searchRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<VirtuosoHandle>(null);

    // Virtuoso keeps its scroll offset across data swaps; a remount key blinked.
    React.useEffect(() => {
      listRef.current?.scrollTo({ top: 0 });
    }, [category, isSearching]);

    // The panel only hides, so a still-focused input keeps eating canvas shortcuts.
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

    // A pending update-policy change wins over API data, so draft edits persist.
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

    const drawResourcePolicies = useCallback(
      (droppedResources: NetworkResource[], position?: XYPosition) => {
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
        // The dropped nodes must land on the canvas before their edges attach.
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
          if (policy) handleExistingPolicyDrop(policy, position);
          else addBlankPolicy(position);
          setGhostData(undefined);
          onClose();
        });
      },
      [onDragStart, handleExistingPolicyDrop, addBlankPolicy, onClose],
    );

    const addBlankNode = useCallback(
      (kind: BlankKind, position?: XYPosition, targetNodeId?: string) => {
        if (kind === "group") {
          const pos = position
            ? { x: position.x - 100, y: position.y - 30 }
            : { x: 0, y: 0 };
          addNewGroup(pos);
          return;
        }
        // A resource needs an address, so its card is only created on modal save.
        if (kind === "resource") {
          const targetFrame = drilled
            ? drillDownNetworkNodeId
            : targetNodeId?.startsWith("network-")
            ? targetNodeId
            : undefined;
          if (targetFrame) {
            setResourceEditor({ createInNetworkNodeId: targetFrame });
          } else {
            setResourceEditor({ createStandaloneAt: position ?? null });
          }
          return;
        }
        addBlankPlaceholderNode(kind, position);
      },
      [
        addBlankPlaceholderNode,
        setResourceEditor,
        addNewGroup,
        drilled,
        drillDownNetworkNodeId,
      ],
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
          {
            canDropIntoFrame: kind === "resource",
            // The editor modal opens instead, so never zoom on click-to-place.
            skipClickReveal: kind === "resource",
          },
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
          // Stamp the network ref so the standalone card shows its name.
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

    // Structural only: position updates would re-render this list every drag tick.
    const canvasNodes = useStructuralNodes();
    const account = useAccount();
    const canvasNodeIds = useMemo(
      () => new Set(canvasNodes.map((n) => n.id)),
      [canvasNodes],
    );

    // A resource folded into a group's frame row has no node but is still
    // on-canvas, so a second drop must be blocked.
    const foldedResourceIds = useMemo(() => {
      const groupIds = new Set<string>();
      canvasNodes.forEach((n) => {
        if (n.type !== "resourceGroupNode") return;
        const gid = (n.data as { group?: { id?: string } })?.group?.id;
        if (gid) groupIds.add(gid);
      });
      const ids = new Set<string>();
      if (groupIds.size === 0) return ids;
      (resources ?? []).forEach((r) => {
        const inFolded = ((r.groups ?? []) as (Group | string)[]).some((g) =>
          groupIds.has(typeof g === "string" ? g : g?.id ?? ""),
        );
        if (inFolded && r.id) ids.add(r.id);
      });
      return ids;
    }, [canvasNodes, resources]);


    // Entities marked for deletion can't be re-added: they'd vanish on deploy.
    const pendingDeleteIds = useMemo(() => {
      const ids = {
        group: new Set<string>(),
        policy: new Set<string>(),
        network: new Set<string>(),
        resource: new Set<string>(),
      };
      changes.forEach((c) => {
        if (c.type === "delete-group") ids.group.add(c.groupId);
        else if (c.type === "delete-policy") ids.policy.add(c.policyId);
        else if (c.type === "delete-resource") ids.resource.add(c.resourceId);
        else if (c.type === "delete-network") {
          ids.network.add(c.networkId);
          // The server cascades a network delete to its resources.
          networks
            ?.find((n) => n.id === c.networkId)
            ?.resources?.forEach((rid) => ids.resource.add(rid));
        }
      });
      return ids;
    }, [changes, networks]);

    // A category word reveals the whole matching section, not just name matches.
    const categoryMatch = useCallback(
      (keywords: string[]) => {
        const s = query.toLowerCase();
        if (!s) return false;
        return keywords.some((k) => k.includes(s) || s.includes(k));
      },
      [query],
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
      if (!query || peersCategory) return peers;
      const lower = query.toLowerCase();
      return peers.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.ip?.toLowerCase().includes(lower) ||
          p.hostname?.toLowerCase().includes(lower),
      );
    }, [peers, query, peersCategory]);

    const filteredResources = useMemo(() => {
      if (!resources) return [];
      let list = resources;
      if (drilled) {
        if (drillDownNetworkNodeId!.startsWith("network-new-")) return [];
        const realId = drillDownNetworkNodeId!.replace("network-", "");
        const ids = new Set(
          networks?.find((n) => String(n.id) === realId)?.resources ?? [],
        );
        list = resources.filter((r) => r.id && ids.has(r.id));
      }
      if (!query || resourcesCategory) return list;
      const lower = query.toLowerCase();
      return list.filter(
        (r) =>
          r.name?.toLowerCase().includes(lower) ||
          r.address?.toLowerCase().includes(lower),
      );
    }, [
      resources,
      query,
      resourcesCategory,
      drilled,
      drillDownNetworkNodeId,
      networks,
    ]);

    const filteredGroups = useMemo(() => {
      if (!groups) return [];
      if (!query || groupsCategory) return groups;
      const lower = query.toLowerCase();
      return groups.filter((g) => g.name?.toLowerCase().includes(lower));
    }, [groups, query, groupsCategory]);

    const filteredPolicies = useMemo(() => {
      if (!policies) return [];
      if (!query || policiesCategory) return policies;
      const lower = query.toLowerCase();
      return policies.filter((p) => p.name?.toLowerCase().includes(lower));
    }, [policies, query, policiesCategory]);

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
      if (!query || groupsCategory) return result;
      const lower = query.toLowerCase();
      return result.filter((r) => r.group.name.toLowerCase().includes(lower));
    }, [canvasNodes, query, groupsCategory]);

    const draftResources = useMemo(() => {
      const result: { nodeId: string; resource: NetworkResource }[] = [];
      canvasNodes.forEach((n) => {
        const resource = getDraftResource(n);
        if (!resource) return;
        if (drilled) {
          const dn = (
            n.data as {
              draftNetwork?: { networkId?: string; networkClientId?: string };
            }
          )?.draftNetwork;
          if (
            `network-${dn?.networkClientId ?? dn?.networkId ?? ""}` !==
            drillDownNetworkNodeId
          )
            return;
        }
        result.push({ nodeId: n.id, resource });
      });
      if (!query || resourcesCategory) return result;
      const lower = query.toLowerCase();
      return result.filter((r) =>
        r.resource.name.toLowerCase().includes(lower),
      );
    }, [
      canvasNodes,
      query,
      resourcesCategory,
      drilled,
      drillDownNetworkNodeId,
    ]);

    const draftPeers = useMemo(() => {
      const result: { nodeId: string; peer: Peer }[] = [];
      canvasNodes.forEach((n) => {
        const peer = getPlaceholderPeer(n);
        if (peer) result.push({ nodeId: n.id, peer });
      });
      if (!query || peersCategory) return result;
      const lower = query.toLowerCase();
      return result.filter((r) => r.peer.name.toLowerCase().includes(lower));
    }, [canvasNodes, query, peersCategory]);

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
      if (!query || policiesCategory) return result;
      const lower = query.toLowerCase();
      return result.filter((r) =>
        (r.policy.name ?? "").toLowerCase().includes(lower),
      );
    }, [canvasNodes, query, policiesCategory]);

    const filteredNetworks = useMemo(() => {
      // No other network is addable while drilled into one.
      if (!networks || drilled) return [];
      if (!query || resourcesCategory) return networks;
      const lower = query.toLowerCase();
      return networks.filter((n) => n.name.toLowerCase().includes(lower));
    }, [networks, query, resourcesCategory, drilled]);

    const draftNetworks = useMemo(() => {
      if (drilled) return [];
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
      if (!query || resourcesCategory) return result;
      const lower = query.toLowerCase();
      return result.filter((r) => r.name.toLowerCase().includes(lower));
    }, [canvasNodes, query, resourcesCategory, drilled]);

    const matchesSearch = useCallback(
      (label: string) =>
        !query || label.toLowerCase().includes(query.toLowerCase()),
      [query],
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
            (!drilled &&
              t.kind === "network" &&
              (networksCategory || matchesSearch(t.label))),
        ),
      [matchesSearch, resourcesCategory, networksCategory, drilled],
    );
    const showPolicyTemplate = policiesCategory || matchesSearch("Policy");

    const buildPeerTemplateRows = () =>
      filteredPeerTemplates.map((tpl) => (
        <TemplateItem
          key={tpl.key}
          icon={tpl.icon}
          label={tpl.label}
          description={tpl.description}
          onPointerDown={(e) => handlePeerTemplateDragStart(e, tpl)}
          data-testid={`cc-template-peer-${tpl.key}`}
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
              onPointerDown={(e) => handlePolicyDragStart(e)}
              data-testid={"cc-template-policy"}
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
          onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
          data-testid={`cc-template-${tpl.kind}`}
        />
      ));

    const buildResourceTemplateRows = () =>
      resourceTemplates.map((tpl) => (
        <TemplateItem
          key={tpl.kind}
          icon={tpl.icon}
          label={tpl.label}
          description={tpl.description}
          onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
          data-testid={`cc-template-${tpl.kind}`}
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
            data-testid={`cc-panel-peer-${peer.id}`}
          >
            <DeviceCard device={peer} size="small" className="flex-1" />
          </PanelListItem>
        );
      });

    const buildDraftPeerRows = () =>
      draftPeers.map(({ nodeId, peer }) => (
        <PanelListItem key={nodeId} disabled onCanvas>
          <DeviceCard
            // The real IP is only assigned on install.
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
                <span className={"text-[0.72rem] text-nb-gray-400 truncate"}>
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
              <span className={"text-[0.72rem] text-nb-gray-400 truncate"}>
                {resourceCount
                  ? singularize("Resources", resourceCount)
                  : "No Resources"}
              </span>
            </div>
          </div>
        </PanelListItem>
      ));

    const buildNetworkRows = () =>
      filteredNetworks.map((network) => {
        const onCanvas = canvasNodeIds.has(`network-${network.id}`);
        const pendingDelete = pendingDeleteIds.network.has(network.id ?? "");
        return (
          <PanelListItem
            key={network.id}
            disabled={onCanvas || pendingDelete}
            onCanvas={onCanvas}
            onPointerDown={(e) =>
              handleDragStart(e, NodeType.NetworkNode, network)
            }
            data-testid={`cc-panel-network-${network.id}`}
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
                    "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                  }
                >
                  <TruncatedText
                    text={network.name}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                  {pendingDelete && <DeletedBadge />}
                </span>
                <span className={"text-[0.72rem] text-nb-gray-400 truncate"}>
                  {network.resources?.length
                    ? singularize("Resources", network.resources.length)
                    : "No Resources"}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    const buildResourceRows = () =>
      filteredResources.map((resource) => {
        const onCanvas =
          canvasNodeIds.has(`resource-${resource.id}`) ||
          foldedResourceIds.has(resource.id ?? "");
        const network = networks?.find((n) =>
          n.resources?.some((r) => r === resource.id),
        );
        const displayResource = network
          ? { ...resource, name: `${resource.name} - ${network.name}` }
          : resource;
        const pendingDelete = pendingDeleteIds.resource.has(resource.id ?? "");
        return (
          <PanelListItem
            key={resource.id}
            disabled={onCanvas || pendingDelete}
            onCanvas={onCanvas}
            onPointerDown={(e) =>
              handleDragStart(e, NodeType.ResourceNode, resource)
            }
            data-testid={`cc-panel-resource-${resource.id}`}
          >
            <DeviceCard
              resource={displayResource}
              size="small"
              className="flex-1"
              badge={pendingDelete ? <DeletedBadge /> : undefined}
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
              <span className={"text-[0.72rem] text-nb-gray-400"}>
                {getGroupCountLabel(group)}
              </span>
            </div>
          </div>
        </PanelListItem>
      ));

    const buildGroupRows = () =>
      filteredGroups.map((group) => {
        const pendingDelete = pendingDeleteIds.group.has(group.id ?? "");
        const onCanvas = canvasNodeIds.has(`group-${group.id}`);
        return (
          <PanelListItem
            key={group.id}
            disabled={onCanvas || pendingDelete}
            onCanvas={onCanvas}
            onPointerDown={(e) => handleDragStart(e, NodeType.GroupNode, group)}
            data-testid={`cc-panel-group-${group.id}`}
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
                  {pendingDelete && <DeletedBadge />}
                </span>
                <span className={"text-[0.72rem] text-nb-gray-400"}>
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
        const pendingDelete = pendingDeleteIds.policy.has(policy.id ?? "");
        return (
          <PanelListItem
            key={policy.id}
            disabled={onCanvas || pendingDelete}
            onCanvas={onCanvas}
            onPointerDown={(e) => handlePolicyDragStart(e, policy)}
            data-testid={`cc-panel-policy-${policy.id}`}
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
                    "text-xs text-nb-gray-100 flex items-center gap-2 min-w-0"
                  }
                >
                  <TruncatedText
                    text={policy.name}
                    maxWidth={"150px"}
                    hideTooltip={true}
                  />
                  {pendingDelete && <DeletedBadge />}
                </span>
                <span className={"text-[0.72rem] text-nb-gray-400 truncate"}>
                  {protocolLabel || "All"}
                </span>
              </div>
            </div>
          </PanelListItem>
        );
      });

    // Rows build lazily so opening the panel doesn't render every entity list.
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
          // The global Escape shortcut stays quiet while focus is in the panel.
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            }
          }}
          className={cn(
            !open && "pointer-events-none",
            // Must stay above the group panel (z-20).
            "absolute bottom-[80px] left-1/2 z-30",
            "w-[480px] max-w-[calc(100%-48px)] h-[420px] max-h-[calc(100%-170px)]",
            "border border-nb-gray-910 rounded-lg flex flex-col overflow-hidden",
            "bg-nb-gray-935 shadow-xl",
          )}
        >
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
            {/* Not an X: an X next to a search reads as "clear the search". */}
            <button
              onClick={onClose}
              className={cn(
                "shrink-0 px-1.5 py-0.5 rounded border border-nb-gray-900 bg-nb-gray-920",
                "shadow-[0_2px_0_0_#1e2123,inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                "text-[8px] font-medium tracking-wide text-nb-gray-350",
                "hover:bg-nb-gray-910 hover:text-nb-gray-200 transition-colors",
              )}
            >
              ESC
            </button>
          </div>

          <div className={"flex flex-1 min-h-0"}>
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
                    data-testid={`cc-category-${cat.id}`}
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

            {flatRows.length > 0 ? (
              <MemoizedScrollArea
                withoutViewport={true}
                className={"flex-1 min-h-0"}
              >
                <Virtuoso
                  ref={listRef}
                  // The panel only fades when closed, so remount to re-measure.
                  key={open ? "open" : "closed"}
                  data={flatRows}
                  overscan={300}
                  // Exact row height: an overestimate inflates the scrollbar.
                  defaultItemHeight={52}
                  computeItemKey={(index) => flatRows[index].key}
                  itemContent={(index, row) => (
                    <div className={cn("px-2", index === 0 && "pt-2")}>
                      {row.kind === "heading" ? (
                        <div
                          className={
                            "text-xs font-medium text-nb-gray-400 uppercase tracking-wider px-3 pt-1.5 pb-1"
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

const DeletedBadge = () => (
  <span
    className={
      "text-[0.55rem] leading-none px-1 py-[0.3rem] rounded-[3px] bg-red-900/40 border border-red-500/20 text-red-400"
    }
  >
    DELETED
  </span>
);

const TemplateItem = React.memo(
  ({
    icon: Icon,
    label,
    description,
    onPointerDown,
    "data-testid": dataTestId,
  }: {
    icon?: LucideIcon;
    label: string;
    description?: string;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    "data-testid"?: string;
  }) => {
    return (
      <div
        onPointerDown={onPointerDown}
        data-testid={dataTestId}
        className={
          "group/item flex items-center h-[52px] rounded-md px-1 transition-colors hover:bg-nb-gray-900/50 cursor-grab active:cursor-grabbing"
        }
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
          <div
            className={
              "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
            }
          >
            {Icon && <Icon size={14} />}
          </div>
          <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
            <span className={"text-xs text-nb-gray-100"}>{label}</span>
            <span className={"text-[0.72rem] text-nb-gray-400"}>
              {description}
            </span>
          </div>
        </div>
        <GripVerticalIcon
          size={14}
          className="shrink-0 ml-auto mr-3 text-nb-gray-400"
        />
      </div>
    );
  },
);

TemplateItem.displayName = "TemplateItem";

const PanelListItem = React.memo(
  ({
    children,
    onPointerDown,
    disabled,
    onCanvas,
    "data-testid": dataTestId,
  }: PropsWithChildren<{
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    disabled?: boolean;
    onCanvas?: boolean;
    "data-testid"?: string;
  }>) => {
    return (
      <div
        onPointerDown={disabled ? undefined : onPointerDown}
        data-testid={dataTestId}
        className={cn(
          "group/item flex items-center h-[52px] rounded-md px-1 transition-colors",
          disabled
            ? "cursor-default"
            : "hover:bg-nb-gray-900/50 cursor-grab active:cursor-grabbing",
        )}
      >
        {/* Only the entity content dims, so the badge stays readable. */}
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
