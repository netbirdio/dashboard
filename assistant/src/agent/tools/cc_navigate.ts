import { defineTool } from "@/agent/tools/_contract.ts";

// Point the canvas at a view or a specific entity.
export default defineTool({
  runtime: "client",
  description:
    "Point the control center at a view: the peers, users, groups or networks view, or one specific network " +
    "(`view: \"network\"`). Pass `target` to say which peer / user / group / network to build the view around — its " +
    "real id, or `\"self\"` for the user's own peer or user row. Opens the control center first " +
    "if the user isn't there. " +
    "In a DRAFT there are no view tabs — the canvas is what you built, and the only navigation is `network` to " +
    "drill into a frame on it and `networks` to come back out. Asking for the view you're already on is harmless " +
    "but pointless: to work with something you can't see, cc_add it (existing_peer / existing_group / " +
    "existing_policy / existing_network) rather than trying to navigate to it. Never switch views to escape a " +
    "draft — an untouched empty one is dropped for you if you navigate away, and one with work in it stays put.",
  inputSchema: {
    type: "object",
    properties: {
      view: {
        type: "string",
        enum: ["peers", "users", "groups", "networks", "network"],
        description: "Which view. `network` needs a `target`.",
      },
      target: {
        type: "string",
        description:
          "The peer/user/group/network to centre the view on, by its id, or \"self\".",
      },
    },
    required: ["view"],
  },
});
