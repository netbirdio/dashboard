import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List setup keys. Call this when the user asks about enrollment keys (does not expose secret values).",
  inputSchema: listInput,
});
