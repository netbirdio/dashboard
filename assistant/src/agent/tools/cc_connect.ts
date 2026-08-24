import { defineTool } from "@/agent/tools/_contract.ts";

// Draw an access edge between two nodes on the draft.
export default defineTool({
  runtime: "client",
  description:
    "Draw ONE connection on the draft canvas. Take node ids from " +
    "cc_state or from what cc_add returned. Direction is what picks a policy's side: `from` a node `to` a policy " +
    "makes it a SOURCE, `from` a policy `to` a node makes it a DESTINATION. Resources and networks are " +
    "destination-only whichever way you draw them. Connecting two non-policy nodes opens the create-policy dialog " +
    "for the user to finish instead, and a network has to have its destination picked in a dialog too — so prefer " +
    "routing through a policy node you added yourself, and read each step's result to see whether one opened.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", description: "The source node's id." },
      to: { type: "string", description: "The target node's id." },
      final: {
        type: "boolean",
        description:
          "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
      },
    },
    required: ["from", "to"],
  },
});
