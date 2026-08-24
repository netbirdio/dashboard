import { defineTool } from "@/agent/tools/_contract.ts";
import { emptyInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "Get account-level settings. Call this when the user asks about account configuration.",
  inputSchema: emptyInput,
});
