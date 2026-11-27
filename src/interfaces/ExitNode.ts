/**
 * An exit node routes internet traffic (0.0.0.0/0) for other peers through
 * one or more of its own peers. Who may use it is decided only by access
 * control policies whose destination is the exit node
 * (`destinationResource: { id, type: "exit_node" }`).
 */
export interface ExitNode {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // Apply the exit node automatically on the peers its policies allow.
  auto_apply: boolean;
  peers: ExitNodePeer[];
}

export interface ExitNodePeer {
  peer_id: string;
  // Lower is preferred: the enabled peer with the lowest metric is the primary.
  metric: number;
  enabled: boolean;
}

/** Body of POST /exit-nodes and PUT /exit-nodes/:id. */
export type ExitNodeRequest = Omit<ExitNode, "id">;

export const EXIT_NODE_DEFAULT_METRIC = 100;
export const EXIT_NODE_METRIC_STEP = 100;
export const EXIT_NODE_MIN_METRIC = 1;
export const EXIT_NODE_MAX_METRIC = 9999;
export const EXIT_NODE_NAME_MAX_LENGTH = 40;
