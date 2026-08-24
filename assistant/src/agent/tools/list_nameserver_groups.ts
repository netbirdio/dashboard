import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List DNS nameserver groups. Call this when the user asks about DNS configuration.",
  inputSchema: listInput,
});
