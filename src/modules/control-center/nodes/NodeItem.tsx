import { NodeType } from "@/modules/control-center/utils/nodes";
import { PeerNode } from "@/modules/control-center/nodes/PeerNode";
import { GroupNode } from "@/modules/control-center/nodes/GroupNode";
import { ResourceNode } from "@/modules/control-center/nodes/ResourceNode";
import { Peer } from "@/interfaces/Peer";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useDragAndDropPosition } from "@/modules/control-center/DragAndDropProvider";
import { cn } from "@utils/helpers";
import * as React from "react";

interface NodeItemProps {
  type: string;
  data: Peer | Group | NetworkResource;
  ghost?: boolean;
}

export function NodeItem({ type, data, ghost = false }: NodeItemProps) {
  const id = ghost ? "ghost" : (data.id as string);
  const position = { x: 0, y: 0 };

  let node = null;

  if (type === NodeType.PeerNode) {
    node = (
      <PeerNode
        type={NodeType.PeerNode}
        data={{ peer: data as Peer, enabled: true, showHandles: false }}
        id={id}
        position={position}
      />
    );
  } else if (type === NodeType.GroupNode) {
    node = (
      <GroupNode
        type={NodeType.GroupNode}
        data={{ group: data as Group, enabled: true }}
        id={id}
        position={position}
      />
    );
  } else if (type === NodeType.ResourceNode) {
    node = (
      <ResourceNode
        type={NodeType.ResourceNode}
        data={{ resource: data as NetworkResource, enabled: true }}
        id={id}
        position={position}
      />
    );
  }

  return ghost ? <GhostNode>{node}</GhostNode> : node;
}

function GhostNode({ children }: { children: React.ReactNode }) {
  const { position } = useDragAndDropPosition();

  if (!position) return null;

  return (
    <div
      className={cn("fixed pointer-events-none z-[99]")}
      style={{
        transform: `translate(${position.x - 140}px, ${
          position.y - 100
        }px) translate(-50%, -50%)`,
      }}
    >
      {children}
    </div>
  );
}
