import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List all groups. Call this when the user asks about groups or which peers/users belong to a group.",
  inputSchema: listInput,
});
