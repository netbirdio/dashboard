import { defineTool } from "@/agent/tools/_contract.ts";

// Move the camera or re-lay the draft out.
export default defineTool({
  runtime: "client",
  description:
    "Move the camera: `zoom_in`, `zoom_out`, `fit_view`, or `auto_arrange` (re-lays the draft out and fits it). " +
    "New nodes place themselves in reading order (sources left, policies centre, destinations right) and the canvas " +
    "re-arranges itself a moment after you stop adding or connecting — so don't manage the layout by hand. Call " +
    "this when the user asks, or to fit the view after something else moved things around. " +
    "A step list may open with a `·` line (e.g. \"Auto-arranged the canvas and fitted the view\"): that's something " +
    "the canvas did by itself since your last call, not a step of yours — don't repeat it back as your own work.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["zoom_in", "zoom_out", "fit_view", "auto_arrange"],
      },
    },
    required: ["action"],
  },
});
