import { GroupNode } from "@/modules/control-center/nodes/GroupNode";
import { NetworkNode } from "@/modules/control-center/nodes/NetworkNode";
import { PeerNode } from "@/modules/control-center/nodes/PeerNode";
import { PolicyNode } from "@/modules/control-center/nodes/PolicyNode";
import { ResourceNode } from "@/modules/control-center/nodes/ResourceNode";
import { SelectGroupNode } from "@/modules/control-center/nodes/SelectGroupNode";
import { SelectPeerNode } from "@/modules/control-center/nodes/SelectPeerNode";
import { SelectUserNode } from "@/modules/control-center/nodes/SelectUserNode";

export const NODE_TYPES = {
  groupNode: GroupNode,
  sourceGroupNode: GroupNode,
  destinationGroupNode: GroupNode,
  destinationResourceNode: ResourceNode,

  networkNode: NetworkNode,
  resourceNode: ResourceNode,
  policyNode: PolicyNode,

  peerNode: PeerNode,
  sourcePeerNode: PeerNode,
  expandedGroupPeer: PeerNode,

  selectPeerNode: SelectPeerNode,
  selectGroupNode: SelectGroupNode,
  selectUserNode: SelectUserNode,
};
