import { defineTool } from "@/agent/tools/_contract.ts";

// Send the dashboard to a page, optionally with a filter already applied.
export default defineTool({
  runtime: "client",
  description:
    "Navigate the dashboard to a page. Use it when the user asks to be taken somewhere (\"open that peer\", \"take me to DNS\"), " +
    "or when your answer ends in something they have to do in the UI and the page is the next step — then say you navigated " +
    "there, in a few words. Don't navigate to read data (call the read tool instead), don't navigate to a page they're already " +
    "on, and never navigate more than once in a turn. `id` takes the resource's real id from a tool result; `tab` is only for " +
    "settings. For \"my\" anything, find the row with `yours: true` first and navigate to that one.",
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: [
          "peers",
          "peer",
          "groups",
          "group",
          "access_control",
          "posture_checks",
          "networks",
          "network",
          "routes",
          "dns",
          "setup_keys",
          "users",
          "user",
          "activity",
          "settings",
          "integrations",
          "control_center",
        ],
        description: "Which page. The singular ones (peer, group, network, user) need an `id`.",
      },
      id: {
        type: "string",
        description: "The resource's id for a detail page, exactly as a tool result gave it.",
      },
      tab: {
        type: "string",
        description: "settings/integrations only: the tab to open, e.g. `authentication`.",
      },
    },
    required: ["page"],
  },
});
