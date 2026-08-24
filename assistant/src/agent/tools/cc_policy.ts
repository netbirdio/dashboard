import { defineTool } from "@/agent/tools/_contract.ts";

// Edit the policy behind an access edge.
export default defineTool({
  runtime: "client",
  description:
    "Edit a policy on the draft canvas — everything its editor holds except which groups are on each side (that's " +
    "cc_connect): name, description, enabled, protocol, ports, and direction. Only the fields you pass change. " +
    "Every policy is an allow rule; there is no deny. Ports belong to tcp/udp only. Use it on every policy you " +
    "draw: a real name, a description saying what it is for, and the protocol and ports that service actually " +
    "listens on. Leaving `all` open is not a neutral default in a zero-trust product — narrow it from what the " +
    "destination IS (a database host, a printer, an internal web app all have well-known ports). " +
    "`bidirectional` is the direction: true means either side may open a connection to the other, false means only " +
    "the SOURCE may open one to the destination (replies on connections it opened still come back — the firewall " +
    "is stateful). Read the user's intent: \"A can reach B\", \"give the team access to the server\" is one-way, " +
    "which is also the safer default; only make it bidirectional when both ends genuinely need to start " +
    "connections, like two peers syncing. A policy whose destination is a network resource is one-way no matter " +
    "what you pass — a subnet or a domain has nothing to initiate from.",
  inputSchema: {
    type: "object",
    properties: {
      node: { type: "string", description: "The policy node's id." },
      name: { type: "string" },
      description: {
        type: "string",
        description: "What this policy is for. One line, the reason not the mechanics.",
      },
      enabled: { type: "boolean" },
      protocol: { type: "string", enum: ["all", "tcp", "udp", "icmp"] },
      ports: {
        type: "array",
        description: "Ports or ranges, e.g. [\"443\", \"8000-8080\"]. tcp/udp only.",
        items: { type: "string" },
      },
      bidirectional: {
        type: "boolean",
        description:
          "True: either side may open a connection. False (usually what's meant): only the source may.",
      },
      final: {
        type: "boolean",
        description:
          "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
      },
    },
    required: ["node"],
  },
});
