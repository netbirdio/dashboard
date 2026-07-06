import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";
import {
  OnDropAction,
  useDragAndDrop,
} from "@/modules/control-center/DragAndDropProvider";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { DropdownInput } from "@components/DropdownInput";
import { useSearch } from "@hooks/useSearch";
import { removeAllSpaces } from "@utils/helpers";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { NodeItem } from "@/modules/control-center/nodes/NodeItem";

const searchPredicate = (item: NodeTypeData<any>, query: string) => {
  if (!query) return false;
  const lower = removeAllSpaces(query.toLowerCase());
  const find = (s: string | undefined) =>
    removeAllSpaces(s?.toLowerCase()).includes(lower);

  if (item.type === NodeType.GroupNode) {
    const { data } = item;
    const { name, id } = data as Group;
    if (find(name)) return true;
    if (find(id)) return true;
  }

  if (item.type === NodeType.PeerNode) {
    const { data } = item;
    const { id, ip, dns_label, hostname, name } = data as Peer;
    if (find(id)) return true;
    if (find(ip)) return true;
    if (find(dns_label)) return true;
    if (find(hostname)) return true;
    if (find(name)) return true;
  }

  return false;
};

type NodeTypeData<D> = {
  id?: string;
  data: D;
  type: string;
};

export const ControlCenterComponentsPanel = () => {
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");
  const { data: networkResources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: groups, isLoading: isGroupsLoading } =
    useFetchApi<Group[]>("/groups");

  const reactFlow = useReactFlow();
  const { onDragStart, isDragging } = useDragAndDrop();
  const [ghostNode, setGhostNode] = useState<NodeTypeData<any>>();

  const addNode = useCallback(
    (
      type: NodeType,
      data: Peer | Group | NetworkResource,
      position?: XYPosition,
    ) => {
      let nodeData: any;
      let nodeId: string;

      if (type === NodeType.PeerNode) {
        nodeData = { peer: data as Peer, enabled: true, showHandles: true };
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
            ? { x: position.x, y: position.y - 10 }
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
        setGhostNode(undefined);
      };
    },
    [addNode],
  );

  const items = useMemo(() => {
    const itemsPeers: NodeTypeData<Peer>[] =
      peers?.map((data) => {
        return {
          id: data.id,
          type: NodeType.PeerNode,
          data,
        };
      }) ?? [];
    const itemsGroups: NodeTypeData<Group>[] =
      groups?.map((data) => {
        return {
          id: data.id,
          type: NodeType.GroupNode,
          data,
        };
      }) ?? [];
    return [...itemsPeers, ...itemsGroups];
  }, [peers, groups]);

  const [filteredItems, search, setSearch, setQuery, isSearching] = useSearch(
    items,
    searchPredicate,
    {
      filter: true,
      debounce: 350,
    },
  );

  return (
    <>
      {isDragging && ghostNode && (
        <NodeItem type={ghostNode.type} data={ghostNode.data} ghost />
      )}
      <div className={"absolute left-0 top-0 px-6 z-10 h-full overflow-hidden"}>
        <div className={"h-full pt-[70px] pb-4"}>
          <div
            className={
              "bg-nb-gray-930 rounded-lg border-nb-gray-900 border w-[340px] h-full overflow-hidden"
            }
          >
            <DropdownInput
              hideEnterIcon={true}
              value={search}
              onChange={setSearch}
              autoFocus={true}
              className={"my-0 py-0"}
              placeholder={"Search peers, groups or resources..."}
            />
            <VirtualScrollAreaList
              onSelect={() => {}}
              items={filteredItems}
              maxHeight={400}
              scrollAreaClassName={"pt-0"}
              estimatedItemHeight={48}
              estimatedHeadingHeight={32}
              heightAdjustment={5}
              renderItem={(node) => {
                return (
                  <div
                    key={node.id}
                    className={"cursor-grab active:cursor-grabbing"}
                    onPointerDown={(event) => {
                      setGhostNode(node);
                      onDragStart(
                        event,
                        createDropHandler(node.type as NodeType, node.data),
                      );
                    }}
                  >
                    <NodeItem type={node.type} data={node.data} />
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
