import { defineTool } from "@/agent/tools/_contract.ts";
import { listInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "List users in the account. Call this when the user asks who has access or about user roles.",
  inputSchema: listInput,
});
