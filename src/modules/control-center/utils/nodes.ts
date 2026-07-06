import { GroupNode } from "@/modules/control-center/nodes/GroupNode";
import { NetworkNode } from "@/modules/control-center/nodes/NetworkNode";
import { PeerNode } from "@/modules/control-center/nodes/PeerNode";
import { PolicyNode } from "@/modules/control-center/nodes/PolicyNode";
import { ResourceNode } from "@/modules/control-center/nodes/ResourceNode";
import { SelectGroupNode } from "@/modules/control-center/nodes/SelectGroupNode";
import { SelectPeerNode } from "@/modules/control-center/nodes/SelectPeerNode";
import { SelectUserNode } from "@/modules/control-center/nodes/SelectUserNode";

export enum NodeType {
  GroupNode = "groupNode",
  SourceGroupNode = "sourceGroupNode",
  DestinationGroupNode = "destinationGroupNode",
  DestinationResourceNode = "destinationResourceNode",
  NetworkNode = "networkNode",
  ResourceNode = "resourceNode",
  PolicyNode = "policyNode",
  PeerNode = "peerNode",
  SourcePeerNode = "sourcePeerNode",
  ExpandedGroupPeer = "expandedGroupPeer",
  SelectPeerNode = "selectPeerNode",
  SelectGroupNode = "selectGroupNode",
  SelectUserNode = "selectUserNode",
}

export const NODE_TYPES = {
  [NodeType.GroupNode]: GroupNode,
  [NodeType.SourceGroupNode]: GroupNode,
  [NodeType.DestinationGroupNode]: GroupNode,
  [NodeType.DestinationResourceNode]: ResourceNode,
  [NodeType.NetworkNode]: NetworkNode,
  [NodeType.ResourceNode]: ResourceNode,
  [NodeType.PolicyNode]: PolicyNode,
  [NodeType.PeerNode]: PeerNode,
  [NodeType.SourcePeerNode]: PeerNode,
  [NodeType.ExpandedGroupPeer]: PeerNode,
  [NodeType.SelectPeerNode]: SelectPeerNode,
  [NodeType.SelectGroupNode]: SelectGroupNode,
  [NodeType.SelectUserNode]: SelectUserNode,
};
