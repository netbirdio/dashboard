import { defineTool } from "@/agent/tools/_contract.ts";

export default defineTool({
  runtime: "client",
  description:
    "Get details for a single peer by id. Call this after list_peers when the user wants specifics about one device.",
  inputSchema: {
    type: "object",
    properties: { peer_id: { type: "string", description: "The peer's id from list_peers." } },
    required: ["peer_id"],
  },
});
