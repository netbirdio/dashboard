import * as React from "react";
import { PropsWithChildren, useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@utils/helpers";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@components/Accordion";
import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { Boxes, Globe, GripVerticalIcon, LucideIcon, MonitorSmartphoneIcon, Search, UsersIcon, XIcon } from "lucide-react";
import TruncatedText from "@components/ui/TruncatedText";
import { ScrollArea } from "@components/ScrollArea";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { Input } from "@/components/Input";
import Kbd from "@components/Kbd";
import { OnDropAction, useDragAndDrop, useDragAndDropPosition } from "@/modules/control-center/DragAndDropProvider";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";

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

  const addNode = useCallback(
    (
      type: NodeType,
      data: Peer | Group | NetworkResource,
      position?: XYPosition,
    ) => {
      let nodeData: any;
      let nodeId: string;

      if (type === NodeType.PeerNode) {
        nodeData = { peer: data as Peer, enabled: true, showHandles: true, variant: "card" };
        nodeId = `peer-${data.id}`;
      } else if (type === NodeType.GroupNode) {
        nodeData = { group: data as Group, enabled: true, showHandles: true };
        nodeId = `group-${data.id}`;
      } else if (type === NodeType.ResourceNode) {
        nodeData = { resource: data as NetworkResource, enabled: true, showHandles: true };
        nodeId = `resource-${data.id}`;
      }

      reactFlow.setNodes((prev) =>
        prev.concat({
          id: nodeId!,
          type: type,
          data: nodeData,
          position: position
            ? { x: position.x - 100, y: position.y - 25 }
            : { x: 0, y: 0 },
        }),
      );
    },
    [reactFlow],
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

  const filteredPeers = useMemo(() => {
    if (!peers) return [];
    if (!search) return peers;
    const lower = search.toLowerCase();
    return peers.filter(
      (p) =>
        p.name?.toLowerCase().includes(lower) ||
        p.ip?.toLowerCase().includes(lower) ||
        p.hostname?.toLowerCase().includes(lower),
    );
  }, [peers, search]);

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    if (!search) return resources;
    const lower = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.name?.toLowerCase().includes(lower) ||
        r.address?.toLowerCase().includes(lower),
    );
  }, [resources, search]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!search) return groups;
    const lower = search.toLowerCase();
    return groups.filter((g) => g.name?.toLowerCase().includes(lower));
  }, [groups, search]);

  return (
    <>
      {isDragging && ghostData && <DragGhost ghost={ghostData} />}
      <div
        className={cn(
          "absolute left-6 top-[72px] bottom-[64px] z-20",
          "border border-nb-gray-900 rounded-lg w-[360px] flex flex-col overflow-hidden",
          "bg-nb-gray-940/95 backdrop-blur-sm shadow-xl",
        )}
      >
        <div className={"flex items-center justify-between px-6 pt-4"}>
          <div className={"flex items-center gap-2 text-sm text-nb-gray-200"}>
            <Boxes size={15} />
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
        <div className={"px-6 mt-4"}>
          <Input
            icon={<Search size={15} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={"Search components..."}
            customSuffix={<Kbd>⌘ K</Kbd>}
            className={"h-[40px]"}
          />
        </div>
        <ScrollArea className={"flex-1 pt-3"}>
          <Accordion
            type="multiple"
            defaultValue={["peers", "resources", "groups"]}
          >
            {filteredPeers.length > 0 && (
              <AccordionItem value="peers">
                <SidebarSectionTrigger
                  icon={MonitorSmartphoneIcon}
                  label="Peers"
                  count={filteredPeers.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-6 pb-3"}>
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

            {filteredResources.length > 0 && (
              <AccordionItem value="resources">
                <SidebarSectionTrigger
                  icon={Globe}
                  label="Resources"
                  count={filteredResources.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-6 pb-3"}>
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

            {filteredGroups.length > 0 && (
              <AccordionItem value="groups">
                <SidebarSectionTrigger
                  icon={UsersIcon}
                  label="Groups"
                  count={filteredGroups.length}
                />
                <AccordionContent>
                  <div className={"flex flex-col gap-2 px-6 pb-3"}>
                    {filteredGroups.map((group) => (
                      <SidebarListItem
                        key={group.id}
                        disabled={canvasNodeIds.has(`group-${group.id}`)}
                        onPointerDown={(e) =>
                          handleDragStart(e, NodeType.GroupNode, group)
                        }
                      >
                        <div className="flex items-center gap-2 flex-1 pl-2 py-0.5">
                          <div
                            className={
                              "h-7 w-7 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"
                            }
                          >
                            <GroupBadgeIcon
                              id={group.id}
                              issued={group.issued}
                              size={12}
                            />
                          </div>
                          <div className={"flex flex-col leading-none"}>
                            <span className={"text-xs text-nb-gray-100"}>
                              <TruncatedText
                                text={group.name}
                                maxWidth={"150px"}
                                hideTooltip={true}
                              />
                            </span>
                            <span className={"text-[0.7rem] text-nb-gray-400"}>
                              {group.peers_count || 0} peer(s)
                              {(group.resources_count ?? 0) > 0 &&
                                `, ${group.resources_count} resource(s)`}
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

const SidebarSectionTrigger = ({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
}) => {
  return (
    <AccordionTrigger
      className={
        "px-6 text-xs gap-2 py-3 !my-0 text-nb-gray-350 hover:!opacity-100 hover:text-nb-gray-300"
      }
    >
      <div className={"flex items-center gap-2 font-normal text-[0.85rem]"}>
        <div>
          {label} ({count})
        </div>
      </div>
    </AccordionTrigger>
  );
};

const SidebarListItem = React.memo(({
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
        "group/item flex items-center rounded-md border border-nb-gray-910 bg-nb-gray-930/50 py-2 px-1 transition-colors",
        disabled
          ? "opacity-40 cursor-default"
          : "hover:bg-nb-gray-900/50 cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {children}
      {!disabled && (
        <GripVerticalIcon size={14} className="shrink-0 ml-auto mr-3 text-nb-gray-400" />
      )}
    </div>
  );
});

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
