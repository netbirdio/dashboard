/**
 * The fixtures behind the preview screen: one session and one transcript that
 * between them use every part the chat can render.
 *
 * Built the way the real thing is, not faked past it — the rows go through the
 * `Redactor` and into the `ResourceStore` exactly as `useToolExecutor` would, so
 * the preview also exercises placeholder minting and restoration rather than
 * just the visuals. Anything that renders `{PEER_1}` here would render
 * `{PEER_1}` in a real chat too.
 */
import type {
  ThreadMessageLike,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import { ResourceStore } from "../data/resourceStore";
import { Redactor } from "../privacy/redaction";
import type { AssistantSession } from "../privacy/RedactorContext";
import { COMPONENT_PART } from "../runtime/useAssistantRuntime";

/** Peers as the management API returns them, before redaction. */
const PEERS = [
  {
    id: "peer-a",
    name: "eduards-macbook",
    ip: "100.84.12.3",
    connected: true,
    os: "Darwin 25.5.0",
    last_seen: "2026-08-11T09:14:00Z",
  },
  {
    id: "peer-b",
    name: "build-runner-01",
    ip: "100.84.12.9",
    connected: false,
    os: "Ubuntu 24.04",
    last_seen: "2026-08-09T22:41:00Z",
  },
  {
    id: "peer-c",
    name: "office-gateway",
    ip: "100.84.12.1",
    connected: true,
    os: "Debian 12",
    last_seen: "2026-08-11T09:15:00Z",
  },
];

const GROUPS = [
  { id: "group-a", name: "Contractors", peers_count: 4 },
  { id: "group-b", name: "Build servers", peers_count: 2 },
];

const POLICIES = [
  { id: "policy-a", name: "All to All", enabled: true, description: "Default" },
];

/**
 * A session pre-loaded with the rows above. Tokens are minted in redaction
 * order, so `{PEER_1}` is the MacBook, `{IP_1}` its address and `{GROUP_1}` the
 * contractors — which is how the transcript below refers to them.
 */
export function createPreviewSession(): AssistantSession {
  const redactor = new Redactor();
  const resources = new ResourceStore();

  resources.record("peer", redactor.redact("peer", PEERS));
  resources.record("group", redactor.redact("group", GROUPS));
  resources.record("policy", redactor.redact("policy", POLICIES));

  return { redactor, resources };
}

const MARKDOWN = `Here's everything the renderer can do, in one answer.

## Headings and text

A paragraph with **bold**, *italic*, ~~struck through~~ text, an \`inline code\`
span, a placeholder that resolves to a real device — {PEER_1} — and a
[link to the docs](https://docs.netbird.io/how-to/getting-started).

### A third level, styled like the second

> A blockquote, for when the model is quoting a doc page rather than speaking
> for itself.

## Lists

- An unordered item
- Another one, with \`code\` in it
  - A nested item
  - And its sibling
- A last one

1. Ordered, first
2. Ordered, second
3. Ordered, third

## A table

| Peer | Address | Status |
| --- | --- | --- |
| {PEER_1} | {IP_1} | Connected |
| {PEER_2} | {IP_2} | Offline |
| {PEER_3} | {IP_3} | Connected |

## Code

Install the agent on a Linux host:

\`\`\`bash
curl -fsSL https://pkgs.netbird.io/install.sh | sh
netbird up --setup-key <YOUR_KEY>
\`\`\`

On Windows:

\`\`\`powershell
# Install and join, then confirm the peer came up
winget install NetBird.NetBird
netbird up --setup-key $env:NB_SETUP_KEY
netbird status --detail
\`\`\`

And the equivalent request against the API:

\`\`\`json
{
  "name": "office-gateway",
  "ssh_enabled": false,
  "login_expiration_enabled": true
}
\`\`\`

A fence with no language, which falls back to plain:

\`\`\`
peer {PEER_1} -> {IP_1} (connected)
\`\`\`

---

That's the lot.`;

/**
 * What a management tool actually hands back: the redacted rows, as the
 * executor sent them to the model. The trail prints this under "Result", so the
 * fixture has to be the real shape or the panel looks nothing like production.
 */
const PEERS_RESULT = JSON.stringify(
  PEERS.map((peer, index) => ({
    id: `{PEER_${index + 1}}`,
    name: `{PEER_${index + 1}}`,
    ip: `{IP_${index + 1}}`,
    connected: peer.connected,
    os: peer.os,
    last_seen: peer.last_seen,
  })),
);

const SHORT_ANSWER = `Three peers, two of them online. {PEER_2} last checked in
on 9 August, so its login has probably expired.`;

/**
 * A resolved tool-call part — the shape the runtime builds for the trail. The
 * input matters as much as the result here: it's what the row shows as a chip
 * and what the expanded panel prints under "Request".
 */
const toolPart = (
  id: string,
  toolName: string,
  result: string,
  args: Record<string, unknown> = {},
  isError = false,
) => ({
  type: "tool-call" as const,
  toolCallId: id,
  toolName,
  args: args as ToolCallMessagePart["args"],
  argsText: JSON.stringify(args),
  result,
  isError,
});

/**
 * An inline component part, carried as a resolved tool call. The cast mirrors
 * the runtime's: a component is JSON by construction, but only the server's
 * schema says so.
 */
const componentPart = (id: string, component: Record<string, unknown>) => ({
  type: "tool-call" as const,
  toolCallId: id,
  toolName: COMPONENT_PART,
  args: component as ToolCallMessagePart["args"],
  argsText: JSON.stringify(component),
  result: component,
});

/**
 * The transcript. Every entry is one thing worth looking at: message bubbles,
 * reasoning, the activity trail (including a failure), the full Markdown range,
 * both inline components, an answer that ended in an error, and one that ran
 * out of steps. The second answer has enough steps to collapse into a summary;
 * the first has two, which stay expanded.
 */
export const PREVIEW_MESSAGES: ThreadMessageLike[] = [
  {
    role: "user",
    content: [{ type: "text", text: "How many peers do I have?" }],
  },
  {
    role: "assistant",
    content: [
      {
        type: "reasoning",
        text: "A count, so list_peers is enough — no need to fetch each one.",
      },
      toolPart("t1", "list_peers", PEERS_RESULT),
      { type: "text", text: SHORT_ANSWER },
    ],
  },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Show me {PEER_1} and everything else you can render.",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        type: "reasoning",
        text: "They want the whole range, so I should answer in Markdown and use both inline components rather than describing them. Checking the docs first for the setup-key wording.",
      },
      toolPart("t2", "search_docs", "4 pages", {
        query: "setup key expiration",
      }),
      toolPart("t3", "fetch_doc", "Read “Getting started”", {
        url: "https://docs.netbird.io/how-to/getting-started",
      }),
      toolPart(
        "t4",
        "get_peer",
        "Peer not found",
        { peer_id: "{PEER_4}" },
        true,
      ),
      { type: "text", text: MARKDOWN },
      componentPart("c1", {
        component: "resource_table",
        resource: "peer",
        columns: ["name", "ip", "connected", "os"],
        ids: ["{PEER_1}", "{PEER_2}", "{PEER_3}"],
      }),
      componentPart("c2", {
        component: "canvas_preview",
        title: "New policy: contractors to the build runner",
        resource: "policy",
        data: {
          name: "contractors-to-builds",
          enabled: true,
          sources: ["{GROUP_1}"],
          destinations: ["{GROUP_2}"],
          protocol: "tcp",
          ports: [22, 443],
        },
        action: {
          label: "Create policy",
          tool: "create_policy",
          input: { name: "contractors-to-builds" },
        },
      }),
    ],
  },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Could anyone outside engineering reach the build servers?",
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        type: "reasoning",
        text: "Reachability is decided by policies, not by the peers themselves, so I need the policy list and the groups each rule names — the peer list only tells me who exists.\n\nThe build servers are a group, so the question is really: which source groups appear in a rule whose destination includes that group. Anything matching all-to-all counts too, and that one is easy to miss because it names no group at all.",
      },
      toolPart(
        "t8",
        "list_groups",
        JSON.stringify([
          { id: "{GROUP_1}", name: "{GROUP_1}", peers_count: 4 },
          { id: "{GROUP_2}", name: "{GROUP_2}", peers_count: 2 },
        ]),
      ),
      toolPart(
        "t9",
        "list_policies",
        JSON.stringify([
          {
            id: "{POLICY_1}",
            name: "{POLICY_1}",
            enabled: true,
            rules: [{ sources: ["{GROUP_1}"], destinations: ["{GROUP_2}"] }],
          },
        ]),
      ),
      {
        type: "reasoning",
        text: "Two rules reach it, and one of them is the default all-to-all. That's the answer — the specific rule is fine, the catch-all is the problem.",
      },
      toolPart("t10", "list_peers", PEERS_RESULT),
      {
        type: "text",
        text: "Yes — the default **All to All** policy still applies, so every peer in the account can reach the build servers, not just engineering. The specific rule you set up is doing nothing extra while that one is enabled.",
      },
    ],
  },
  {
    role: "user",
    content: [{ type: "text", text: "What if you run out of steps?" }],
  },
  {
    role: "assistant",
    content: [
      toolPart("t5", "list_groups", "12 groups"),
      toolPart("t6", "list_policies", "8 policies"), // a plain summary, for contrast
      {
        type: "text",
        text: "Checking which policies reach the build servers.\n\n_I stopped after too many steps without reaching an answer. Try narrowing the question._",
      },
    ],
  },
  {
    role: "user",
    content: [{ type: "text", text: "And a turn I interrupt half way?" }],
  },
  {
    role: "assistant",
    content: [
      toolPart("t7", "list_peers", PEERS_RESULT),
      { type: "text", text: "Your peers are spread across two regions, with" },
    ],
    status: { type: "incomplete", reason: "cancelled" },
  },
  {
    role: "user",
    content: [{ type: "text", text: "And what does a failure look like?" }],
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Can't reach the assistant service — it looks offline or is restarting. Try again in a minute, or contact your administrator if it keeps happening.",
      },
    ],
    status: { type: "incomplete", reason: "error", error: "stream failed" },
  },
];
