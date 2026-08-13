/**
 * NetBird tool registry — the agent-computer interface, provider-neutral. Typed
 * and allowlisted (not a generic api_call) so the caller can gate/render per
 * action. Tools are read-only; the `mutating` flag lets the caller require
 * explicit confirmation before executing one.
 *
 * `runtime` says who executes a tool. "client" tools (the management API, and the
 * control-center canvas) run in the caller with the user's JWT — the server
 * returns the request and ends the turn. "server" tools (the docs) hit only
 * public pages, so the server runs them inline (see src/docs, src/routes/chat.ts)
 * and never involves the caller.
 */
import type { LlmTool } from "@/types.ts";
import { renderComponentSpec } from "@/ui/render.ts";
import { askUserSpec } from "@/ui/ask.ts";

export type ToolRuntime = "client" | "server";

export interface NetbirdTool {
  spec: LlmTool;
  /** Whether executing this tool changes state (requires UI confirmation). */
  mutating: boolean;
  /** Who executes it: the caller ("client") or this server ("server"). */
  runtime: ToolRuntime;
}

const emptyInput: Record<string, unknown> = { type: "object", properties: {} };

export const TOOLS: Record<string, NetbirdTool> = {
  list_peers: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_peers",
      description:
        "List all peers (devices) in the user's NetBird account. Call this when the user asks about their devices, how many peers they have, peer status, or to find a peer by name.",
      inputSchema: emptyInput,
    },
  },
  get_peer: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "get_peer",
      description:
        "Get details for a single peer by id. Call this after list_peers when the user wants specifics about one device.",
      inputSchema: {
        type: "object",
        properties: { peer_id: { type: "string", description: "The peer id." } },
        required: ["peer_id"],
      },
    },
  },
  list_groups: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_groups",
      description:
        "List all groups. Call this when the user asks about groups or which peers/users belong to a group.",
      inputSchema: emptyInput,
    },
  },
  list_policies: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_policies",
      description:
        "List access-control policies. Call this when the user asks what traffic is allowed/denied or about their policies.",
      inputSchema: emptyInput,
    },
  },
  list_routes: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_routes",
      description:
        "List network routes. Call this when the user asks about routed networks or exit nodes.",
      inputSchema: emptyInput,
    },
  },
  list_nameserver_groups: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_nameserver_groups",
      description:
        "List DNS nameserver groups. Call this when the user asks about DNS configuration.",
      inputSchema: emptyInput,
    },
  },
  list_setup_keys: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_setup_keys",
      description:
        "List setup keys. Call this when the user asks about enrollment keys (does not expose secret values).",
      inputSchema: emptyInput,
    },
  },
  list_users: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_users",
      description:
        "List users in the account. Call this when the user asks who has access or about user roles.",
      inputSchema: emptyInput,
    },
  },
  get_account_settings: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "get_account_settings",
      description:
        "Get account-level settings. Call this when the user asks about account configuration.",
      inputSchema: emptyInput,
    },
  },
  list_events: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "list_events",
      description:
        "List recent activity/audit events. Call this when the user asks what changed or who did something recently.",
      inputSchema: emptyInput,
    },
  },

  /*
    Navigation. A client tool like the rest, but it acts on the dashboard rather
    than reading from the API: the caller pushes a route and the user's view
    changes under them. Not `mutating` — nothing about the account changes, and
    the back button undoes it — but the description leans hard on restraint,
    because moving someone's screen unasked is its own kind of rude.
  */
  open_page: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "open_page",
      description:
        "Navigate the dashboard to a page. Use it when the user asks to be taken somewhere (\"open that peer\", \"take me to DNS\"), " +
        "or when your answer ends in something they have to do in the UI and the page is the next step — then say you navigated " +
        "there, in a few words. Don't navigate to read data (call the read tool instead), don't navigate to a page they're already " +
        "on, and never navigate more than once in a turn. `id` takes the resource's placeholder ({PEER_1}); `tab` is only for " +
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
            description: "The resource placeholder for a detail page, e.g. {PEER_1}.",
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

  /*
    Control center. Client tools that DRAW rather than read: they drive the
    canvas the user is looking at — its views, and a draft they can review
    before anything is applied. Nothing here changes the account (a draft is
    local until the user deploys it), so none is `mutating`; but they do move
    someone's work in front of them, so the descriptions lean on restraint the
    way open_page does.

    Node handles arrive as `{NODE_n}` placeholders from cc_state or from an
    earlier step's result, and a node also carries the token of the account
    entity behind it (`{PEER_3}`) so the two views of the same thing line up.
  */
  cc_state: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "cc_state",
      description:
        "Read the control-center canvas: whether it's in live or draft mode, which view it's on, and every node on it " +
        "with its `{NODE_n}` handle, kind, name and what can be done to it (`can.rename` / `can.remove` / `can.delete`), " +
        "plus the edges between them and the draft's pending changes. Call this before acting on existing nodes — the " +
        "handles it returns are what every other cc_ tool takes. The other cc_ tools already return the updated canvas, " +
        "so you don't need to call this again after one of them.",
      inputSchema: emptyInput,
    },
  },
  cc_navigate: {
    mutating: false,
    runtime: "client",
    spec: {
      name: "cc_navigate",
      description:
        "Point the control center at a view: the peers, users, groups or networks view, or one specific network " +
        "(`view: \"network\"`). Pass `target` to say which peer / user / group / network to build the view around — a " +
        "`{PEER_n}`-style placeholder, or `\"self\"` for the user's own peer or user row. Opens the control center first " +
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
              "The peer/user/group/network to centre the view on, as its placeholder, or \"self\".",
          },
        },
        required: ["view"],
      },
    },
  },
  cc_draft: {
    mutating: false,
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
    mutating: false,
    runtime: "client",
    spec: {
      name: "cc_add",
      description:
        "Add ONE thing to the draft canvas. Placeholder peers (`server`, `agent`, `user_device`) stand for machines " +
        "that still have to install NetBird; `existing_*` kinds place something from the account (pass its placeholder " +
        "as `ref`); `new_*` kinds create draft-only ones. The result carries the `{NODE_n}` handle you then connect. " +
        "Build a policy as `new_policy` plus two cc_connect links (source → policy, policy → destination): connecting " +
        "two non-policy nodes directly opens a dialog the user has to finish instead. Say each node's `role` so it " +
        "appears on the correct side immediately. " +
        "A `new_group` holds whatever you put in it — peers, resources, or both. A group of resources (\"Databases\", " +
        "\"Printers\") is how a policy reaches several of them at once, so when a network has resources that share a " +
        "rule, group them: pass their {NODE_n}s as `members` and the group is never drawn empty. " +
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
              "For an `existing_*` kind: that resource's placeholder, e.g. {PEER_1}.",
          },
          members: {
            type: "array",
            items: { type: "string" },
            description:
              "`new_group` only: what the group starts with — the {NODE_n} of peers/resources already on the canvas, or the {PEER_n}/{RESOURCE_n} of ones that were never drawn. Use it whenever you know why the group exists (\"the databases\", \"the printers\"): the group is never drawn empty, and it saves an add_to_group call per member. Members it can't find are skipped and the reply says how many landed.",
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
              "What to call it. Descriptive and in the account's own naming style. Never put a placeholder in a name — a name is words a person reads, and \"Colleagues to {PEER_1}\" is not one. If you only know a peer as a placeholder, name the thing after its role (\"Colleagues to the build server\").",
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
              "The `{NODE_n}` of the network frame this belongs in — required for new_resource_group, optional for new_resource.",
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
    mutating: false,
    runtime: "client",
    spec: {
      name: "cc_connect",
      description:
        "Draw ONE connection on the draft canvas. Take `{NODE_n}` handles from " +
        "cc_state or from what cc_add returned. Direction is what picks a policy's side: `from` a node `to` a policy " +
        "makes it a SOURCE, `from` a policy `to` a node makes it a DESTINATION. Resources and networks are " +
        "destination-only whichever way you draw them. Connecting two non-policy nodes opens the create-policy dialog " +
        "for the user to finish instead, and a network has to have its destination picked in a dialog too — so prefer " +
        "routing through a policy node you added yourself, and read each step's result to see whether one opened.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source node, e.g. {NODE_1}." },
          to: { type: "string", description: "Target node, e.g. {NODE_2}." },
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
    mutating: false,
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
        "`{NODE_n}` on the canvas (its card moves into the group, including a resource sitting in a network frame) or " +
        "a peer/resource placeholder that was never drawn. " +
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
              "The node to act on, e.g. {NODE_3} — or, for add_to_group, the {PEER_n}/{RESOURCE_n} joining the group.",
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
            description: "add_to_group only: the group node's {NODE_n}.",
          },
          network: {
            type: "string",
            description:
              "route_network only: the network frame's {NODE_n} that `node` should route.",
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
    mutating: false,
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
          node: { type: "string", description: "The policy node, e.g. {NODE_4}." },
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
    mutating: false,
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

  // ── Documentation (executed server-side; read only public NetBird docs) ──────
  search_docs: {
    mutating: false,
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
    mutating: false,
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
    mutating: false,
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

  // ── UI (executed server-side; renders an inline component after validation) ──
  render_component: {
    mutating: false,
    runtime: "server",
    spec: renderComponentSpec,
  },
  ask_user: {
    mutating: false,
    runtime: "server",
    spec: askUserSpec,
  },
};

/**
 * Neutral tool specs to hand to a provider adapter. Server-executed tools (docs)
 * are advertised only when `includeServer` is set (the chat route ties this to
 * DOCS_ENABLED) so a deployment can turn them off cleanly.
 */
export function toolSpecs(includeServer = true): LlmTool[] {
  return Object.values(TOOLS)
    .filter((t) => includeServer || t.runtime !== "server")
    .map((t) => t.spec);
}

export function isKnownTool(name: string): boolean {
  return name in TOOLS;
}

export function isMutating(name: string): boolean {
  return TOOLS[name]?.mutating ?? false;
}

/** True when the tool is executed by this server (docs), not the caller. */
export function isServerTool(name: string): boolean {
  return TOOLS[name]?.runtime === "server";
}
