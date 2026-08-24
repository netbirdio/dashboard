import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List recent activity/audit events. Call this when the user asks what changed or who did something recently.",
  inputSchema: listInput,
});
