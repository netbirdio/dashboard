import { defineTool } from "@/agent/tools/_contract.ts";

// Edit, rename, or remove a node on the draft.
export default defineTool({
  runtime: "client",
  description:
    "Do ONE thing to a node on the canvas — the actions its right-click menu offers. " +
    "`rename` (draft groups, placeholders, draft resources and draft networks only — you don't need it for something " +
    "you just created, cc_add names it at birth), `remove` (takes a node off " +
    "the canvas, deletes nothing), `delete` (marks the real thing for deletion when the draft deploys), " +
    "`enable`/`disable` a resource, `add_to_group`, `route_network`, `move` to a canvas position, and " +
    "`focus`/`unfocus`/`details` to highlight or open a node's panel. " +
    "`add_to_group` is group membership in both directions and works for RESOURCES exactly as it does for peers — " +
    "putting a resource in a group, putting a peer in a group, and giving a peer a group are all the same call: " +
    "`node` is the member, `group` is the group. There is no separate resource-group tool because a resource group " +
    "IS a group; make one with `cc_add` `new_group` and add each resource with this. The member may be a " +
    "node on the canvas (its card moves into the group, including a resource sitting in a network frame) or " +
    "the real id of a peer/resource that was never drawn. " +
    "`route_network` makes `node` (a peer or a group) the routing peer of the network frame in `network` — every " +
    "network needs one or nothing reaches its resources. A peer you just placed and haven't installed yet is a " +
    "valid choice: the draft records it and says it must be installed before deploying, which is exactly right for " +
    "an office router the user is about to set up. Nothing is drawn — a routing peer is a row on the frame, not a " +
    "node — so don't try to connect or tidy anything afterwards. " +
    "Check `can` in cc_state before renaming or deleting; `focus`, `unfocus` and `details` also work in live mode, " +
    "the rest need a draft.",
  inputSchema: {
    type: "object",
    properties: {
      node: {
        type: "string",
        description:
          "The id of the node to act on — or, for add_to_group, the real id of the peer/resource joining the group.",
      },
      action: {
        type: "string",
        enum: [
          "rename",
          "remove",
          "delete",
          "enable",
          "disable",
          "focus",
          "unfocus",
          "move",
          "add_to_group",
          "route_network",
          "details",
        ],
      },
      name: { type: "string", description: "rename only: the new name." },
      group: {
        type: "string",
        description: "add_to_group only: the group node's id.",
      },
      network: {
        type: "string",
        description:
          "route_network only: the node id of the network frame that `node` should route.",
      },
      position: {
        type: "object",
        description: "move only: canvas coordinates.",
        properties: { x: { type: "number" }, y: { type: "number" } },
        required: ["x", "y"],
      },
      final: {
        type: "boolean",
        description:
          "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
      },
    },
    required: ["node", "action"],
  },
});
