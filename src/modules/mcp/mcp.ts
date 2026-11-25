export const MCP_DOCS_URL = "https://docs.netbird.io/manage/mcp-server";
export const MCP_CLIENTS_DOCS_URL =
  "https://docs.netbird.io/manage/mcp-server/connect-clients";
export const MCP_SELF_HOSTED_DOCS_URL =
  "https://docs.netbird.io/selfhosted/maintenance/mcp-server";
export const MCP_SIGN_IN_DOCS_URL = `${MCP_SELF_HOSTED_DOCS_URL}#troubleshooting`;

// "token-only" is a server that runs MCP without its OAuth sign-in, so clients
// can connect with a personal access token only.
export type McpStatus = "enabled" | "token-only" | "disabled";

// NetBird Cloud always serves MCP. A self-hosted server is probed, and counts as
// enabled until the probe says otherwise, so no warning flashes.
export const resolveMcpStatus = (
  cloud: boolean,
  probed?: McpStatus,
): McpStatus => (cloud ? "enabled" : probed ?? "enabled");

const request = (url: string, init?: RequestInit) =>
  fetch(url, init).catch(() => undefined);

// Both checks come from the self-hosted docs. The OAuth metadata document only
// exists while MCP and its sign-in run, so it settles the usual case in one
// request. Without it, a request with no credential tells the rest apart:
// 404 means MCP is off, 401 means it runs, with the WWW-Authenticate header
// when sign-in runs too.
// A request the browser could not complete means off only on another origin,
// where the 404 is blocked for carrying no CORS headers. A blocked 404 looks
// the same as a dropped request, so it is asked once more before it counts.
// On the same origin it is a network failure, so it throws and the caller can
// try again.
export const fetchMcpStatus = async (
  url: string,
  crossOrigin: boolean,
  retryDelayMs = 1000,
): Promise<McpStatus> => {
  const metadata = await request(`${url}/.well-known/oauth-protected-resource`);
  if (metadata?.ok) return "enabled";

  const probe = () =>
    request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
  let res = await probe();
  if (!res && crossOrigin) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    res = await probe();
  }
  if (!res) {
    if (crossOrigin) return "disabled";
    throw new Error("MCP endpoint could not be reached");
  }
  if (res.status === 404) return "disabled";
  if (res.status === 401 && !res.headers.get("WWW-Authenticate")) {
    return "token-only";
  }
  return "enabled";
};

export const getMcpServerUrl = (apiOrigin: string) => `${apiOrigin}/api/mcp`;

export type McpClientId =
  | "claude-code"
  | "claude"
  | "codex"
  | "cursor"
  | "vscode"
  | "gemini"
  | "other";

export type McpClientStep = {
  // Words between backticks are shown as a mark, for names to look for on screen.
  // Double backticks make the mark copyable, for values to type in.
  // [label](url) becomes a link.
  text: string;
  code?: string;
};

export type McpStepPart =
  | { type: "text" | "mark" | "copy"; value: string }
  | { type: "link"; value: string; href: string };

const STEP_MARKUP = /``([^`]+)``|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

export const parseStepText = (text: string): McpStepPart[] => {
  const parts: McpStepPart[] = [];
  let last = 0;
  for (const match of text.matchAll(STEP_MARKUP)) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ type: "copy", value: match[1] });
    } else if (match[2] !== undefined) {
      parts.push({ type: "mark", value: match[2] });
    } else {
      parts.push({ type: "link", value: match[3], href: match[4] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
};

export type McpClient = {
  id: McpClientId;
  name: string;
  // Opens this page instead of the setup steps.
  href?: string;
  // Where the setup modal's "Learn more" link goes.
  docsUrl?: string;
  steps: McpClientStep[];
};

export const getMcpClients = (url: string): McpClient[] => [
  {
    id: "claude-code",
    name: "Claude Code",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#claude-code`,
    steps: [
      {
        text: "Open your terminal and add the NetBird MCP Server",
        code: `claude mcp add --transport http netbird "${url}"`,
      },
      { text: "Start Claude Code and open the MCP menu", code: "/mcp" },
      { text: "Select `netbird` and sign in" },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#claude-desktop-and-claude-ai`,
    steps: [
      {
        text: "In Claude Desktop or claude.ai, open `Customize` > `Connectors` and add a custom connector",
      },
      { text: "Name it ``NetBird`` and paste this URL", code: url },
      { text: "Click `Connect` and sign in to NetBird" },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#codex`,
    steps: [
      {
        text: "Open your terminal and add the NetBird MCP Server",
        code: `codex mcp add netbird --url "${url}"`,
      },
      {
        text: "Sign in when Codex opens your browser, or start the sign-in yourself",
        code: "codex mcp login netbird",
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#cursor`,
    steps: [
      {
        text: "Add the NetBird server to ``~/.cursor/mcp.json``",
        code: JSON.stringify({ mcpServers: { netbird: { url } } }, null, 2),
      },
      { text: "Open the MCP settings in Cursor and sign in for `netbird`" },
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#vs-code`,
    steps: [
      {
        text: "Open your terminal and add the NetBird MCP Server",
        code: `code --add-mcp '${JSON.stringify({
          name: "netbird",
          type: "http",
          url,
        })}'`,
      },
      {
        text: "Start the `netbird` server in VS Code and sign in when it asks",
      },
    ],
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    docsUrl: `${MCP_CLIENTS_DOCS_URL}#gemini-cli`,
    steps: [
      {
        text: "Open your terminal and add the NetBird MCP Server",
        code: `gemini mcp add --scope user --transport http netbird "${url}"`,
      },
      { text: "In Gemini CLI, sign in to NetBird", code: "/mcp auth netbird" },
    ],
  },
  {
    id: "other",
    name: "Other Clients",
    href: `${MCP_CLIENTS_DOCS_URL}#other-mcp-clients`,
    steps: [],
  },
];
