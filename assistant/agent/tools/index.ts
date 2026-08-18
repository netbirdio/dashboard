import { jsonSchema, tool, type ToolSet } from "ai";
import { LRUCache } from "lru-cache";
import { isDocTool, runApiTool, runDocTool } from "@/tools/docs.ts";
import { countServerToolCache, observeServerTool } from "@/instrumentation/metrics.ts";
import {
  ASK_USER_TOOL,
  askGate,
  askUserSpec,
  RENDER_COMPONENT_TOOL,
  renderComponentSpec,
  runAskTool,
  runComponentTool,
} from "@/tools/ui.ts";

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolRuntime = "client" | "server";

export interface NetbirdTool {
  spec: ToolSpec;
  runtime: ToolRuntime;
}

const emptyInput: Record<string, unknown> = { type: "object", properties: {} };

// Shared by every list tool. All three run in the dashboard over the FULL
// list before any truncation, so they are how big accounts stay answerable.
const listInput: Record<string, unknown> = {
  type: "object",
  properties: {
    filters: {
      type: "object",
      description:
        'Exact-match filters, field → value, tokens allowed: {"activity_code": "user.peer.add"}, {"connected": true}, ' +
        '{"initiator_id": "[USER_2]"}. Array fields match by containment.',
    },
    since: {
      type: "string",
      description:
        "ISO timestamp — keep rows from it onward (an event's `timestamp`, a peer's `last_seen`).",
    },
    until: {
      type: "string",
      description: "ISO timestamp — keep rows up to it.",
    },
    query: {
      type: "string",
      description:
        "Keep only rows containing this value — a token or plain text, matched case-insensitively across all fields.",
    },
    sort_by: {
      type: "string",
      description:
        "Sort the whole list by this field before anything is returned. Dates, numbers and text all work. " +
        "'First/earliest X' is sort_by the time field with order asc — never paged for.",
    },
    order: {
      type: "string",
      enum: ["asc", "desc"],
      description: "Sort direction for `sort_by` (default asc).",
    },
    offset: {
      type: "number",
      description: "Skip this many rows; use `next_offset` from a truncated result to page.",
    },
    limit: {
      type: "number",
      description:
        "Return at most this many rows (max 200). With sort_by, `limit: 1` fetches an extreme in one call.",
    },
    count_by: {
      type: "string",
      description:
        "Return counts grouped by this field instead of rows — the way to answer 'how many … by …' over the whole list. " +
        "Combines with filters/since/until/query.",
    },
  },
};

export const TOOLS: Record<string, NetbirdTool> = {
  list_peers: {
    runtime: "client",
    spec: {
      name: "list_peers",
      description:
        "List all peers (devices) in the user's NetBird account. Call this when the user asks about their devices, how many peers they have, peer status, or to find a peer by name.",
      inputSchema: listInput,
    },
  },
  get_peer: {
    runtime: "client",
    spec: {
      name: "get_peer",
      description:
        "Get details for a single peer by id. Call this after list_peers when the user wants specifics about one device.",
      inputSchema: {
        type: "object",
        properties: { peer_id: { type: "string", description: "The peer's id from list_peers." } },
        required: ["peer_id"],
      },
    },
  },
  list_groups: {
    runtime: "client",
    spec: {
      name: "list_groups",
      description:
        "List all groups. Call this when the user asks about groups or which peers/users belong to a group.",
      inputSchema: listInput,
    },
  },
  list_policies: {
    runtime: "client",
    spec: {
      name: "list_policies",
      description:
        "List access-control policies. Call this when the user asks what traffic is allowed/denied or about their policies.",
      inputSchema: listInput,
    },
  },
  list_routes: {
    runtime: "client",
    spec: {
      name: "list_routes",
      description:
        "List network routes. Call this when the user asks about routed networks or exit nodes.",
      inputSchema: listInput,
    },
  },
  list_nameserver_groups: {
    runtime: "client",
    spec: {
      name: "list_nameserver_groups",
      description:
        "List DNS nameserver groups. Call this when the user asks about DNS configuration.",
      inputSchema: listInput,
    },
  },
  list_setup_keys: {
    runtime: "client",
    spec: {
      name: "list_setup_keys",
      description:
        "List setup keys. Call this when the user asks about enrollment keys (does not expose secret values).",
      inputSchema: listInput,
    },
  },
  list_users: {
    runtime: "client",
    spec: {
      name: "list_users",
      description:
        "List users in the account. Call this when the user asks who has access or about user roles.",
      inputSchema: listInput,
    },
  },
  get_current_user: {
    runtime: "client",
    spec: {
      name: "get_current_user",
      description:
        "Get the signed-in user's own row: their id, name, email, role and status. Call this when they ask about " +
        "themselves (\"what's my name\", \"what's my role\", \"which user am I\"). For \"my peers\" or \"my setup keys\", " +
        "keep using the `yours: true` flag on list results instead — it's already there.",
      inputSchema: emptyInput,
    },
  },
  get_account_settings: {
    runtime: "client",
    spec: {
      name: "get_account_settings",
      description:
        "Get account-level settings. Call this when the user asks about account configuration.",
      inputSchema: emptyInput,
    },
  },
  list_events: {
    runtime: "client",
    spec: {
      name: "list_events",
      description:
        "List recent activity/audit events. Call this when the user asks what changed or who did something recently.",
      inputSchema: listInput,
    },
  },

  open_page: {
    runtime: "client",
    spec: {
      name: "open_page",
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
    },
  },

  cc_state: {
    runtime: "client",
    spec: {
      name: "cc_state",
      description:
        "Read the control-center canvas: whether it's in live or draft mode, which view it's on, and every node on it " +
        "with its node id, kind, name and what can be done to it (`can.rename` / `can.remove` / `can.delete`), " +
        "plus the edges between them and the draft's pending changes. Call this before acting on existing nodes — the " +
        "node ids it returns are what every other cc_ tool takes. The other cc_ tools already return the updated canvas, " +
        "so you don't need to call this again after one of them.",
      inputSchema: emptyInput,
    },
  },
  cc_navigate: {
    runtime: "client",
    spec: {
      name: "cc_navigate",
      description:
        "Point the control center at a view: the peers, users, groups or networks view, or one specific network " +
        "(`view: \"network\"`). Pass `target` to say which peer / user / group / network to build the view around — its " +
        "real id, or `\"self\"` for the user's own peer or user row. Opens the control center first " +
        "if the user isn't there. " +
        "In a DRAFT there are no view tabs — the canvas is what you built, and the only navigation is `network` to " +
        "drill into a frame on it and `networks` to come back out. Asking for the view you're already on is harmless " +
        "but pointless: to work with something you can't see, cc_add it (existing_peer / existing_group / " +
        "existing_policy / existing_network) rather than trying to navigate to it. Never switch views to escape a " +
        "draft — an untouched empty one is dropped for you if you navigate away, and one with work in it stays put.",
      inputSchema: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["peers", "users", "groups", "networks", "network"],
            description: "Which view. `network` needs a `target`.",
          },
          target: {
            type: "string",
            description:
              "The peer/user/group/network to centre the view on, by its id, or \"self\".",
          },
        },
        required: ["view"],
      },
    },
  },
  cc_draft: {
    runtime: "client",
    spec: {
      name: "cc_draft",
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
    },
  },
  cc_add: {
    runtime: "client",
    spec: {
      name: "cc_add",
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
    },
  },
  cc_connect: {
    runtime: "client",
    spec: {
      name: "cc_connect",
      description:
        "Draw ONE connection on the draft canvas. Take node ids from " +
        "cc_state or from what cc_add returned. Direction is what picks a policy's side: `from` a node `to` a policy " +
        "makes it a SOURCE, `from` a policy `to` a node makes it a DESTINATION. Resources and networks are " +
        "destination-only whichever way you draw them. Connecting two non-policy nodes opens the create-policy dialog " +
        "for the user to finish instead, and a network has to have its destination picked in a dialog too — so prefer " +
        "routing through a policy node you added yourself, and read each step's result to see whether one opened.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "The source node's id." },
          to: { type: "string", description: "The target node's id." },
          final: {
            type: "boolean",
            description:
              "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
          },
        },
        required: ["from", "to"],
      },
    },
  },
  cc_node: {
    runtime: "client",
    spec: {
      name: "cc_node",
      description:
        "Do ONE thing to a node on the canvas — the actions its right-click menu offers. " +
        "`rename` (draft groups, placeholders, draft resources and draft networks only — you don't need it for something " +
        "you just created, cc_add names it at birth), `remove` (takes a node off " +
        "the canvas, deletes nothing), `delete` (marks the real thing for deletion when the draft deploys), " +
        "`enable`/`disable` a resource, `add_to_group`, `route_network`, `move` to a canvas position, and " +
        "`focus`/`unfocus`/`details` to highlight or open a node's panel. " +
        "`add_to_group` is group membership in both directions and works for RESOURCES exactly as it does for peers — " +
        "putting a resource in a group, putting a peer in a group, and giving a peer a group are all the same call: " +
        "`node` is the member, `group` is the group. There is no separate resource-group tool because a resource group " +
        "IS a group; make one with `cc_add` `new_group` and add each resource with this. The member may be a " +
        "node on the canvas (its card moves into the group, including a resource sitting in a network frame) or " +
        "the real id of a peer/resource that was never drawn. " +
        "`route_network` makes `node` (a peer or a group) the routing peer of the network frame in `network` — every " +
        "network needs one or nothing reaches its resources. A peer you just placed and haven't installed yet is a " +
        "valid choice: the draft records it and says it must be installed before deploying, which is exactly right for " +
        "an office router the user is about to set up. Nothing is drawn — a routing peer is a row on the frame, not a " +
        "node — so don't try to connect or tidy anything afterwards. " +
        "Check `can` in cc_state before renaming or deleting; `focus`, `unfocus` and `details` also work in live mode, " +
        "the rest need a draft.",
      inputSchema: {
        type: "object",
        properties: {
          node: {
            type: "string",
            description:
              "The id of the node to act on — or, for add_to_group, the real id of the peer/resource joining the group.",
          },
          action: {
            type: "string",
            enum: [
              "rename",
              "remove",
              "delete",
              "enable",
              "disable",
              "focus",
              "unfocus",
              "move",
              "add_to_group",
              "route_network",
              "details",
            ],
          },
          name: { type: "string", description: "rename only: the new name." },
          group: {
            type: "string",
            description: "add_to_group only: the group node's id.",
          },
          network: {
            type: "string",
            description:
              "route_network only: the node id of the network frame that `node` should route.",
          },
          position: {
            type: "object",
            description: "move only: canvas coordinates.",
            properties: { x: { type: "number" }, y: { type: "number" } },
            required: ["x", "y"],
          },
          final: {
            type: "boolean",
            description:
              "True when this is the LAST change you are making to the draft in this turn. The canvas then arranges and fits once, here — leave it out on intermediate steps and it settles on its own a moment later.",
          },
        },
        required: ["node", "action"],
      },
    },
  },
  cc_policy: {
    runtime: "client",
    spec: {
      name: "cc_policy",
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
    },
  },

  cc_canvas: {
    runtime: "client",
    spec: {
      name: "cc_canvas",
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
    },
  },

  search_docs: {
    runtime: "server",
    spec: {
      name: "search_docs",
      description:
        "Search the public NetBird documentation and knowledge hub for pages relevant to a topic. " +
        "Call this for how-to, concept, configuration, self-hosting, or troubleshooting questions — " +
        "anything answered by the docs rather than the user's own account data. Returns a ranked list " +
        "of {title, section, url}; follow up with fetch_doc to read a page before answering, and cite its URL.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords describing what to find, e.g. 'split DNS setup keys'." },
          limit: { type: "integer", description: "Max results (optional; default is server-configured)." },
        },
        required: ["query"],
      },
    },
  },
  fetch_doc: {
    runtime: "server",
    spec: {
      name: "fetch_doc",
      description:
        "Fetch the full text of one NetBird documentation or knowledge-hub page by URL (as returned by " +
        "search_docs). Only https://docs.netbird.io/… and https://netbird.io/… URLs are allowed. Read the " +
        "page before answering a docs question, and cite the URL in your answer.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The docs.netbird.io or netbird.io page URL to read." },
        },
        required: ["url"],
      },
    },
  },

  get_api_reference: {
    runtime: "server",
    spec: {
      name: "get_api_reference",
      description:
        "Look up the NetBird REST API reference (endpoints and request/response schemas) from the " +
        "official OpenAPI spec. Call this for questions about the API itself — what an endpoint " +
        "returns, which fields exist, how to call it. Not for the user's own data (use the account tools).",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "A resource or endpoint, e.g. 'peers', 'create policy', 'nameserver group'." },
        },
        required: ["query"],
      },
    },
  },

  render_component: {
    runtime: "server",
    spec: renderComponentSpec,
  },
  ask_user: {
    runtime: "server",
    spec: askUserSpec,
  },
};

// The AI SDK tool set for streamText: server tools carry an execute (they run
// here), client tools don't (the dashboard fulfils them and resubmits).
export function buildToolSet(): ToolSet {
  const set: ToolSet = {};
  for (const [name, def] of Object.entries(TOOLS)) {
    const common = {
      description: def.spec.description,
      inputSchema: jsonSchema<Record<string, unknown>>(
        def.spec.inputSchema as Parameters<typeof jsonSchema>[0],
      ),
    };
    if (def.runtime !== "server") {
      set[name] = tool(common);
      continue;
    }
    set[name] = tool({
      ...common,
      execute: async (input, { messages }): Promise<ServerToolResult> => {
        if (name === ASK_USER_TOOL) {
          const gate = askGate(messages);
          if (!gate.allowed) {
            observeServerTool(name, "blocked", 0);
            return { ok: false, content: gate.reason, summary: "Question rejected" };
          }
        }
        return runServerTool(name, input);
      },
      // The model reads the plain content; the structured object (summary,
      // source, ok) is for the dashboard's tool part rendering.
      toModelOutput: ({ output }) => ({
        type: "text",
        value: (output as ServerToolResult).content,
      }),
    });
  }
  return set;
}

export function isServerTool(name: string): boolean {
  return TOOLS[name]?.runtime === "server";
}

// The docs-backed tools; they are also the only server tools safe to cache,
// because their results are public and identical for every account.
export const CACHEABLE_TOOLS: ReadonlySet<string> = new Set([
  "search_docs",
  "fetch_doc",
  "get_api_reference",
]);

export function stableKey(name: string, input: unknown): string {
  return `${name}:${stableStringify(input)}`;
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export interface ServerToolResult {
  ok: boolean;
  content: string;
  summary: string;
  // fetch_doc only: what the dashboard shows in the source list.
  source?: { url: string; title: string; domain: string };
}

async function dispatch(name: string, input: unknown): Promise<ServerToolResult> {
  if (isDocTool(name)) return runDocTool(name, input);
  if (name === "get_api_reference") return runApiTool(input);
  if (name === RENDER_COMPONENT_TOOL) return runComponentTool(input);
  if (name === ASK_USER_TOOL) return runAskTool(input);
  return { ok: false, content: `unknown server tool: ${name}`, summary: "unknown tool" };
}

const cache = new LRUCache<string, ServerToolResult>({ max: 500, ttl: 3600 * 1000 });

export async function runServerTool(name: string, input: unknown): Promise<ServerToolResult> {
  const start = performance.now();
  const observe = (r: ServerToolResult): ServerToolResult => {
    observeServerTool(name, r.ok ? "ok" : "error", (performance.now() - start) / 1000);
    return r;
  };
  if (!CACHEABLE_TOOLS.has(name)) return observe(await dispatch(name, input));

  const c = cache;
  const key = stableKey(name, input);
  const hit = c.get(key);
  if (hit) {
    countServerToolCache(name, "hit", c.size);
    return observe(hit);
  }
  countServerToolCache(name, "miss", c.size);

  const result = await dispatch(name, input);

  if (result.ok) c.set(key, result);
  return observe(result);
}
