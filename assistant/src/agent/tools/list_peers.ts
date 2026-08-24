import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List all peers (devices) in the user's NetBird account. Call this when the user asks about their devices, how many peers they have, peer status, or to find a peer by name.",
  inputSchema: listInput,
});
