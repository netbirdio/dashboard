import { defineTool } from "@/agent/tools/_contract.ts";

// Put new nodes on the draft canvas.
export default defineTool({
  runtime: "client",
    description:
      "Add ONE thing to the draft canvas. Placeholder peers (`server`, `agent`, `user_device`) stand for machines " +
      "that still have to install NetBird; `existing_*` kinds place something from the account (pass its real id " +
      "as `ref`); `new_*` kinds create draft-only ones. The result carries the node id you then connect. " +
      "Build a policy as `new_policy` plus two cc_connect links (source → policy, policy → destination): connecting " +
      "two non-policy nodes directly opens a dialog the user has to finish instead. Say each node's `role` so it " +
      "appears on the correct side immediately. " +
      "A `new_group` holds whatever you put in it — peers, resources, or both. A group of resources (\"Databases\", " +
      "\"Printers\") is how a policy reaches several of them at once, so when a network has resources that share a " +
      "rule, group them: pass their node ids as `members` and the group is never drawn empty. " +
      "For a group of ONE network's resources prefer `new_resource_group` with that network's frame in `network` — " +
      "it sits inside the frame, beside the resources it contains, which is where a reader looks for it. It is an " +
      "ordinary group otherwise, and the resources stay visible in the network either way. " +
      "**Always `name` what you create**, and give a policy, network or resource a `description`. These are labels a " +
      "person reads in a list: write them like a careful admin would — Title Case words, spaces not hyphens " +
      "(\"Build Servers\", \"Contractors to Staging\", \"Office Printers\"), never lowercase slugs " +
      "(\"build-servers\", \"contractors to staging\") and never machine-style names. Peer names look like hostnames " +
      "because they ARE hostnames; don't imitate them here. If the account already has a naming style, match it — the " +
      "existing group and policy names come back readable in cc_state and list_groups, so look before you invent. " +
      "Never leave a generated name like \"Policy (1)\" standing. The one exception is a placeholder for something " +
      "you genuinely can't identify yet: add it unnamed and rename it with cc_node the moment you know.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "server",
            "agent",
            "user_device",
            "existing_peer",
            "existing_group",
            "new_group",
            "new_policy",
            "existing_policy",
            "new_network",
            "existing_network",
            "new_resource",
            "new_resource_group",
          ],
        },
        ref: {
          type: "string",
          description:
            "For an `existing_*` kind: that resource's real id, exactly as a tool result gave it.",
        },
        members: {
          type: "array",
          items: { type: "string" },
          description:
            "`new_group` only: what the group starts with — the node ids of peers/resources already on the canvas, or the real ids of ones that were never drawn. Use it whenever you know why the group exists (\"the databases\", \"the printers\"): the group is never drawn empty, and it saves an add_to_group call per member. Members it can't find are skipped and the reply says how many landed.",
        },
        role: {
          type: "string",
          enum: ["source", "destination"],
          description:
            "Which end of the policy this is — pass it and the node lands on the right side of the canvas straight away (sources left, destinations right). Without it a destination starts on the sources side and only moves when the layout settles.",
        },
        name: {
          type: "string",
          description:
            "What to call it. Descriptive and in the account's own naming style. Never put an id in a name — a name is words a person reads; use the resource's name, or for an unidentified placeholder machine, name the thing after its role (\"Colleagues to the build server\").",
        },
        description: {
          type: "string",
          description:
            "What it is for, for a policy, network or resource. One line, the reason rather than the mechanics.",
        },
        bidirectional: {
          type: "boolean",
          description:
            "new_policy only: false makes it one-way (source → destination), which is usually what's meant. Set it HERE, not with a follow-up edit — a policy draws two lines when bidirectional and one when not, so getting it right at creation avoids showing the user the wrong thing and taking it back.",
        },
        address: {
          type: "string",
          description:
            "new_resource only, and required for it: an IP, CIDR or domain.",
        },
        network: {
          type: "string",
          description:
            "The node id of the network frame this belongs in — required for new_resource_group, optional for new_resource.",
        },
        final: {
          type: "boolean",
          description:
            "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
        },
      },
      required: ["kind"],
    },
});
