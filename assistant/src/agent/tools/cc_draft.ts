import { defineTool } from "@/agent/tools/_contract.ts";

// Open a draft so changes can be staged before they go live.
export default defineTool({
  runtime: "client",
  description:
    "Start or leave a draft. `new_empty` opens a blank canvas to build on; `from_current_view` carries the view " +
    "the user is looking at into a draft, which is what you want when they ask to change something that already " +
    "exists (navigate to it first). Call this as soon as you can tell the work is drafting work — before you know " +
    "what you will build. An empty draft costs nothing, placeholders stand in for what you don't know yet, and " +
    "every later step (rename, rewire, remove) is free to change. `exit` throws the draft away — only on a clear " +
    "request, and the user confirms it when changes are pending. A draft is local: nothing reaches the account " +
    "until the user reviews and deploys it, which is theirs to do, not yours.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["new_empty", "from_current_view", "exit"],
      },
    },
    required: ["action"],
  },
});
