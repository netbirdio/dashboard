import * as React from "react";
import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@utils/helpers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import useFetchApi, { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";
import { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import {
  BotIcon,
  FolderGit2,
  Globe,
  GripVerticalIcon,
  LucideIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PlusIcon,
  Search,
  ServerIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import TruncatedText from "@components/ui/TruncatedText";
import { ScrollArea } from "@components/ScrollArea";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { Input } from "@/components/Input";
import Kbd from "@components/Kbd";
import {
  OnDropAction,
  useDragAndDrop,
  useDragAndDropPosition,
} from "@/modules/control-center/DragAndDropProvider";
import { Node, useReactFlow, XYPosition } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { getGroupCountLabel } from "@/modules/control-center/utils/helpers";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";

// Draggable "create new" templates that drop a blank node onto the canvas.
type BlankKind = "group" | "network" | "resource";

// Clickable "create new" peer templates. NetBird peers are real devices that
// must install the agent, so these open the SetupModal install flow rather
// than dropping a blank node. `isUserDevice` selects the SetupModal variant:
//   true  → user device (interactive login, mobile tabs)
//   false → server / agent (setup-key + Docker)
type PeerTemplate = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  isUserDevice: boolean;
};

const PEER_TEMPLATES: PeerTemplate[] = [
  {
    key: "user-device",
    label: "User Device",
    description: "Install on a computer or phone",
    icon: MonitorSmartphoneIcon,
    isUserDevice: true,
  },
  {
    key: "server",
    label: "Server",
    description: "Install on a server or VM",
    icon: ServerIcon,
    isUserDevice: false,
  },
  {
    key: "agent",
    label: "Agent",
    description: "Add an automated or ephemeral peer",
    icon: BotIcon,
    isUserDevice: false,
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
    icon: Globe,
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

export const ControlCenterComponentsSidebar = () => {
  const { isDraft, componentsPanelOpen, setComponentsPanelOpen } =
    useDraftMode();

  if (!isDraft || !componentsPanelOpen) return null;

  return <SidebarContent onClose={() => setComponentsPanelOpen(false)} />;
};

const SidebarContent = React.memo(({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState("");

  useControlCenterShortcuts({ Escape: onClose });
  const reactFlow = useReactFlow();
  const { onDragStart, isDragging } = useDragAndDrop();
  const [ghostData, setGhostData] = useState<GhostData>();
  const { setInstallModal } = useDraftMode();
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);

  // Server/Agent templates generate a one-off setup key (held locally on the
  // dropped node) so the user can install later from the node's Install button.
  const createSetupKey = useCallback(
    (kind: PeerPlaceholderKind) => {
      const request = setupKeyRequest.post({
        name: `${
          kind === "agent" ? "Agent" : "Server"
        } install (${new Date().toLocaleString()})`,
        type: "one-off",
        expires_in: 24 * 60 * 60,
        revoked: false,
        auto_groups: [],
        usage_limit: 1,
        ephemeral: kind === "agent",
        allow_extra_dns_labels: false,
      });
      notify({
        title: "Setup Key Created",
        description: "A one-off setup key was generated for this install.",
        loadingMessage: "Generating setup key...",
        promise: request,
      });
      return request;
    },
    [setupKeyRequest],
  );

  // Adds a node at the drop point, then re-centers it on the cursor once
  // ReactFlow has measured it — node sizes vary (peer/group/resource), so a
  // fixed offset can't center them all. Drop position comes from
  // screenToFlowPosition, so it's correct regardless of the sidebar's layout.
  const placeDroppedNode = useCallback(
    (node: Node, position?: XYPosition) => {
      reactFlow.setNodes((prev) =>
        prev.concat({ ...node, position: position ?? { x: 0, y: 0 } }),
      );
      if (!position) return;
      let attempts = 0;
      const center = () => {
        const measured = reactFlow.getNode(node.id)?.measured;
        if (
          (measured?.width == null || measured?.height == null) &&
          attempts < 10
        ) {
          attempts++;
          requestAnimationFrame(center);
          return;
        }
        const w = measured?.width ?? 200;
        const h = measured?.height ?? 50;
        reactFlow.updateNode(node.id, {
          position: { x: position.x - w / 2, y: position.y - h / 2 },
        });
      };
      requestAnimationFrame(center);
    },
    [reactFlow],
  );

  const addPeerPlaceholder = useCallback(
    (kind: PeerPlaceholderKind, setupKey: string, position?: XYPosition) => {
      const uid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `peer-${Date.now()}`;
      placeDroppedNode(
        {
          id: `peer-new-${uid}`,
          type: NodeType.PeerNode,
          position: { x: 0, y: 0 },
          data: {
            placeholderKind: kind,
            setupKey,
            showHandles: true,
            enabled: true,
          },
        },
        position,
      );
    },
    [placeDroppedNode],
  );

  const handlePeerDrop = useCallback(
    async (tpl: PeerTemplate, position?: XYPosition) => {
      // User Device installs interactively — just open the setup modal.
      if (tpl.key === "user-device") {
        setInstallModal({ isUserDevice: true });
        return;
      }
      const kind = tpl.key as PeerPlaceholderKind;
      const key = await createSetupKey(kind);
      if (key?.key) addPeerPlaceholder(kind, key.key, position);
    },
    [setInstallModal, createSetupKey, addPeerPlaceholder],
  );

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
        void handlePeerDrop(tpl, position);
        setGhostData(undefined);
      });
    },
    [onDragStart, handlePeerDrop],
  );

  // Drops a fresh, id-less "new" node so the node components render their
  // NEW badge. Each drop gets a unique canvas id so multiple blanks coexist.
  const addBlankNode = useCallback(
    (kind: BlankKind, position?: XYPosition) => {
      const uid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${kind}-${Date.now()}`;
      const pos = { x: 0, y: 0 };

      let node: Node;
      if (kind === "group") {
        node = {
          id: `group-new-${uid}`,
          type: NodeType.GroupNode,
          position: pos,
          data: {
            group: { name: "New Group" },
            enabled: true,
            showHandles: true,
          },
        };
      } else if (kind === "resource") {
        node = {
          id: `resource-new-${uid}`,
          type: NodeType.ResourceNode,
          position: pos,
          data: {
            resource: { name: "New Resource" },
            enabled: true,
            showHandles: true,
          },
        };
      } else {
        node = {
          id: `network-new-${uid}`,
          type: NodeType.NetworkNode,
          position: pos,
          data: { network: { name: "New Network", resources: [] } },
        };
      }

      placeDroppedNode(node, position);
    },
    [placeDroppedNode],
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
      onDragStart(event, ({ position }) => {
        addBlankNode(kind, position);
        setGhostData(undefined);
      });
    },
    [onDragStart, addBlankNode],
  );

  const addNode = useCallback(
    (
      type: NodeType,
      data: Peer | Group | NetworkResource,
      position?: XYPosition,
    ) => {
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
        nodeData = {
          resource: data as NetworkResource,
          enabled: true,
          showHandles: true,
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
    },
    [placeDroppedNode],
  );

  const createDropHandler = useCallback(
    (type: NodeType, data: Peer | Group | NetworkResource): OnDropAction => {
      return ({ position }) => {
        addNode(type, data, position);
        setGhostData(undefined);
      };
    },
    [addNode],
  );

  const handleDragStart = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      type: NodeType,
      data: Peer | Group | NetworkResource,
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
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { data: groups } = useFetchApi<Group[]>("/groups");

  const { nodes: canvasNodes } = useCanvasState();
  const canvasNodeIds = useMemo(
    () => new Set(canvasNodes.map((n) => n.id)),
    [canvasNodes],
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
  const resourcesCategory = categoryMatch(["resource", "resources"]);
  const groupsCategory = categoryMatch(["group", "groups"]);
  const networksCategory = categoryMatch(["network", "networks"]);

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

  const matchesSearch = useCallback(
    (label: string) =>
      !search || label.toLowerCase().includes(search.toLowerCase()),
    [search],
  );
  const filteredPeerTemplates = useMemo(
    () => PEER_TEMPLATES.filter((t) => peersCategory || matchesSearch(t.label)),
    [matchesSearch, peersCategory],
  );
  const groupTemplates = useMemo(
    () =>
      BLANK_TEMPLATES.filter(
        (t) => t.kind === "group" && (groupsCategory || matchesSearch(t.label)),
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

  return (
    <>
      {isDragging && ghostData && <DragGhost ghost={ghostData} />}
      <div
        className={cn(
          "absolute left-6 top-[76px] bottom-5 z-20",
          "border border-nb-gray-900 rounded-lg w-[360px] flex flex-col overflow-hidden",
          "bg-nb-gray-940/95 backdrop-blur-sm shadow-xl",
        )}
      >
        <div className={"flex items-center justify-between px-5 pt-4"}>
          <div className={"flex items-center gap-2 text-sm text-nb-gray-200"}>
            Components
          </div>
          <button
            onClick={onClose}
            className={
              "p-1 rounded hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-colors shrink-0"
            }
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className={"px-5 mt-4"}>
          <Input
            icon={<Search size={15} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={"Search components..."}
            customSuffix={<Kbd>⌘ K</Kbd>}
            className={"h-[40px]"}
          />
        </div>
        <ScrollArea className={"flex-1 min-h-0 pt-2"}>
          <Accordion
            type="multiple"
            defaultValue={["peers", "resources", "groups"]}
          >
            {(!search ||
              filteredPeers.length > 0 ||
              filteredPeerTemplates.length > 0) && (
              <AccordionItem value="peers">
                <SidebarSectionTrigger
                  icon={MonitorSmartphoneIcon}
                  label="Peers"
                  count={filteredPeers.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-5 pb-3"}>
                    {filteredPeerTemplates.map((tpl) => (
                      <TemplateItem
                        key={tpl.key}
                        icon={tpl.icon}
                        label={tpl.label}
                        description={tpl.description}
                        draggable
                        onPointerDown={(e) =>
                          handlePeerTemplateDragStart(e, tpl)
                        }
                      />
                    ))}
                    {filteredPeers.map((peer) => (
                      <SidebarListItem
                        key={peer.id}
                        disabled={canvasNodeIds.has(`peer-${peer.id}`)}
                        onPointerDown={(e) =>
                          handleDragStart(e, NodeType.PeerNode, peer)
                        }
                      >
                        <DeviceCard
                          device={peer}
                          size="small"
                          className="flex-1"
                        />
                      </SidebarListItem>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(!search ||
              filteredResources.length > 0 ||
              resourceTemplates.length > 0) && (
              <AccordionItem value="resources">
                <SidebarSectionTrigger
                  icon={Globe}
                  label="Network Routing"
                  count={filteredResources.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-5 pb-3"}>
                    {resourceTemplates.map((tpl) => (
                      <TemplateItem
                        key={tpl.kind}
                        icon={tpl.icon}
                        label={tpl.label}
                        description={tpl.description}
                        draggable
                        onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
                      />
                    ))}
                    {filteredResources.map((resource) => (
                      <SidebarListItem
                        key={resource.id}
                        disabled={canvasNodeIds.has(`resource-${resource.id}`)}
                        onPointerDown={(e) =>
                          handleDragStart(e, NodeType.ResourceNode, resource)
                        }
                      >
                        <DeviceCard
                          resource={resource}
                          size="small"
                          className="flex-1"
                        />
                      </SidebarListItem>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(!search ||
              filteredGroups.length > 0 ||
              groupTemplates.length > 0) && (
              <AccordionItem value="groups">
                <SidebarSectionTrigger
                  icon={UsersIcon}
                  label="Groups"
                  count={filteredGroups.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-5 pb-3"}>
                    {groupTemplates.map((tpl) => (
                      <TemplateItem
                        key={tpl.kind}
                        icon={tpl.icon}
                        label={tpl.label}
                        description={tpl.description}
                        draggable
                        onPointerDown={(e) => handleBlankDragStart(e, tpl.kind)}
                      />
                    ))}
                    {filteredGroups.map((group) => (
                      <SidebarListItem
                        key={group.id}
                        disabled={canvasNodeIds.has(`group-${group.id}`)}
                        onPointerDown={(e) =>
                          handleDragStart(e, NodeType.GroupNode, group)
                        }
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5">
                          <div
                            className={
                              "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
                            }
                          >
                            <GroupBadgeIcon
                              id={group.id}
                              issued={group.issued}
                              size={14}
                            />
                          </div>
                          <div
                            className={"flex flex-col leading-tight min-w-0"}
                          >
                            <span
                              className={
                                "text-xs text-nb-gray-100 flex items-center min-w-0"
                              }
                            >
                              <TruncatedText
                                text={group.name}
                                maxWidth={"150px"}
                                hideTooltip={true}
                              />
                            </span>
                            <span className={"text-[0.7rem] text-nb-gray-400"}>
                              {getGroupCountLabel(group)}
                            </span>
                          </div>
                        </div>
                      </SidebarListItem>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ScrollArea>
      </div>
    </>
  );
});

SidebarContent.displayName = "SidebarContent";

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
    description: string;
    draggable?: boolean;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    onClick?: () => void;
  }) => {
    return (
      <div
        onPointerDown={onPointerDown}
        onClick={onClick}
        className={cn(
          "group/item flex items-center h-[52px] rounded-md border border-nb-gray-910 bg-nb-gray-930/50 px-1 transition-colors hover:bg-nb-gray-900/50",
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
          <div className={"flex flex-col leading-tight min-w-0"}>
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

const SidebarSectionTrigger = ({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
}) => {
  return (
    <AccordionTrigger
      className={
        "px-5 text-xs gap-2 py-3 !my-0 text-nb-gray-350 hover:!opacity-100 hover:text-nb-gray-300"
      }
    >
      <div className={"flex items-center gap-2 font-normal text-[0.85rem]"}>
        <div>
          {label}
          {count ? ` (${count})` : ""}
        </div>
      </div>
    </AccordionTrigger>
  );
};

const SidebarListItem = React.memo(
  ({
    children,
    className,
    onPointerDown,
    disabled,
  }: PropsWithChildren<{
    className?: string;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
    disabled?: boolean;
  }>) => {
    return (
      <div
        onPointerDown={disabled ? undefined : onPointerDown}
        className={cn(
          "group/item flex items-center h-[52px] rounded-md border border-nb-gray-910 bg-nb-gray-930/50 px-1 transition-colors",
          disabled
            ? "opacity-40 cursor-default"
            : "hover:bg-nb-gray-900/50 cursor-grab active:cursor-grabbing",
          className,
        )}
      >
        {children}
        {!disabled && (
          <GripVerticalIcon
            size={14}
            className="shrink-0 ml-auto mr-3 text-nb-gray-400"
          />
        )}
      </div>
    );
  },
);

SidebarListItem.displayName = "SidebarListItem";

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
