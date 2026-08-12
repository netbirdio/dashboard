/**
 * Executes a client (management) tool call on behalf of the model.
 *
 * Three things happen here, in order, and the order matters:
 *  1. **Resolve** — the model only ever saw placeholders, so any id it passes
 *     back (`{PEER_1}`) is mapped to the real id before the request goes out.
 *  2. **Execute** — against the management API with the user's own JWT, so
 *     management's RBAC bounds the blast radius exactly as it would in the UI.
 *  3. **Redact** — the response goes through the shared allowlist before it can
 *     leave the browser. Default-deny: unlisted fields are dropped.
 */
import { useNetBirdFetch } from "@utils/api";
import loadNetBirdConfig from "@utils/config";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import type { ResourceStore } from "../data/resourceStore";
import type { Redactor } from "../privacy/redaction";
import { CLIENT_TOOLS, OPEN_PAGE_TOOL, pageHref } from "./clientTools";

export interface ToolOutcome {
  /** JSON string handed back to the model — always post-redaction. */
  content: string;
  isError: boolean;
}

/** The per-conversation state a tool call reads and writes. */
export interface ToolSession {
  redactor: Redactor;
  resources: ResourceStore;
}

/** Placeholders look like `{PEER_1}` / `{EMAIL_12}`; map them back to real ids. */
function resolveInput(
  input: Record<string, unknown>,
  redactor: Redactor,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] =
      typeof value === "string" ? redactor.resolve(value) ?? value : value;
  }
  return out;
}

/**
 * Mark the rows that belong to the person asking, before redaction hides who
 * owns what.
 *
 * "Are any of my peers offline?", "open my peer" — the most natural way to
 * refer to your own things, and unanswerable from `{USER_2}`: the model has no
 * idea which user it's talking to. A boolean says exactly what's needed and
 * nothing more — no id, no name, no way to work out whose the other rows are.
 *
 * Two shapes carry it: anything with a `user_id` (peers, setup keys), and the
 * user list itself, where the match is on the row's own id.
 */
function markOwnership(
  value: unknown,
  userId?: string,
  resource?: string,
): unknown {
  if (!userId) return value;
  if (Array.isArray(value)) {
    return value.map((row) => markOwnership(row, userId, resource));
  }
  if (value === null || typeof value !== "object") return value;

  const row = value as Record<string, unknown>;

  if (resource === "user" && typeof row.id === "string") {
    return { ...row, yours: row.id === userId };
  }
  if (typeof row.user_id === "string") {
    return { ...row, yours: row.user_id === userId };
  }
  return value;
}

export function useToolExecutor() {
  const { fetch: netbirdFetch } = useNetBirdFetch(true);
  const { loggedInUser } = useLoggedInUser();
  const router = useRouter();
  const currentUserId = loggedInUser?.id;

  return useCallback(
    async (
      name: string,
      rawInput: unknown,
      { redactor, resources }: ToolSession,
      signal?: AbortSignal,
    ): Promise<ToolOutcome> => {
      /*
        Navigation, not a fetch: resolve the page and push it. `resolveInput`
        below turns the model's `{PEER_1}` back into the real id, which is
        exactly what the route needs — so this runs after it.
      */
      if (name === OPEN_PAGE_TOOL) {
        const target = pageHref(
          resolveInput((rawInput ?? {}) as Record<string, unknown>, redactor),
        );
        if (!target) {
          return {
            content:
              "That isn't a page in this dashboard, or the detail page was missing its id. Didn't navigate.",
            isError: true,
          };
        }
        router.push(target);
        // Also what the model quotes back, so the word it uses matches the row
        // in the activity trail.
        return { content: `Navigated to ${target}.`, isError: false };
      }

      const tool = CLIENT_TOOLS[name];
      if (!tool) {
        // The server vets tool names against its own registry, so this means the
        // server is ahead of the dashboard. Tell the model rather than throwing —
        // it can then answer without this data.
        return {
          content: `Tool "${name}" is not available in this dashboard version.`,
          isError: true,
        };
      }

      const input = resolveInput(
        (rawInput ?? {}) as Record<string, unknown>,
        redactor,
      );

      try {
        const origin = `${loadNetBirdConfig().apiOrigin}/api`;
        const res = await netbirdFetch(`${origin}${tool.path(input)}`, {
          method: "GET",
          signal,
        } as RequestInit);

        if (!res.ok) {
          // Surface the status only. A management error body can echo real
          // names or ids, and this string goes straight to the model.
          return {
            content: `Request failed with status ${res.status}.`,
            isError: true,
          };
        }

        const raw = await res.json();
        const selected = tool.select ? tool.select(raw) : raw;
        const owned = markOwnership(selected, currentUserId, tool.resource);
        const safe = tool.resource
          ? redactor.redact(tool.resource, owned)
          : owned;

        // Keep the redacted rows so `resource_table` can join the ids the model
        // asks for against data we actually fetched. Stored post-redaction, so
        // the store holds no real identifiers either.
        if (tool.resource) resources.record(tool.resource, safe);

        return { content: JSON.stringify(safe), isError: false };
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw err;
        return {
          content: `Could not reach the management API: ${
            (err as Error).message
          }`,
          isError: true,
        };
      }
    },
    [netbirdFetch, currentUserId, router],
  );
}
