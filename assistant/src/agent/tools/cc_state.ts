import { defineTool } from "@/agent/tools/_contract.ts";
import { emptyInput } from "@/agent/tools/_schemas.ts";

// The canvas snapshot, tokenised, for the model to reason over.
export default defineTool({
  runtime: "client",
  description:
    "Read the control-center canvas: whether it's in live or draft mode, which view it's on, and every node on it " +
    "with its node id, kind, name and what can be done to it (`can.rename` / `can.remove` / `can.delete`), " +
    "plus the edges between them and the draft's pending changes. Call this before acting on existing nodes — the " +
    "node ids it returns are what every other cc_ tool takes. The other cc_ tools already return the updated canvas, " +
    "so you don't need to call this again after one of them.",
  inputSchema: emptyInput,
});
