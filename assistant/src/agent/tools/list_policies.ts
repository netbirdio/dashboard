import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List access-control policies. Call this when the user asks what traffic is allowed/denied or about their policies.",
  inputSchema: listInput,
});
