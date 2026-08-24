import { defineTool } from "@/agent/tools/_contract.ts";
import { emptyInput } from "@/agent/tools/_schemas.ts";

export default defineTool({
  runtime: "client",
  description:
    "Get the signed-in user's own row: their id, name, email, role and status. Call this when they ask about " +
    "themselves (\"what's my name\", \"what's my role\", \"which user am I\"). For \"my peers\" or \"my setup keys\", " +
    "keep using the `yours: true` flag on list results instead — it's already there.",
  inputSchema: emptyInput,
});
