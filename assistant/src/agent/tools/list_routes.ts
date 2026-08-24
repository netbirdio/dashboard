import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List network routes. Call this when the user asks about routed networks or exit nodes.",
  inputSchema: listInput,
});
