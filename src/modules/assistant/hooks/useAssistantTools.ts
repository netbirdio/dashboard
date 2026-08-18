"use client";

import { useNetBirdFetch } from "@utils/api";
import loadNetBirdConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import type { ToolOutcome } from "@/interfaces/Assistant";
import {
  CONTROL_CENTER_HREF,
  runControlCenterTool,
} from "@/modules/assistant/tools/control-center-call-tool";
import { navigateToPage } from "@/modules/assistant/tools/navigate-to-page";
import type { Redactor } from "@/modules/assistant/utils/redaction";
import { ASSISTANT_TOOLS } from "@/modules/assistant/utils/tools";

const TEXT = {
  navigated: (href: string) => `Navigated to ${href}.`,
  unknownTool: (name: string) =>
    `Tool "${name}" is not available in this dashboard version.`,
  requestFailed: (status: number) => `Request failed with status ${status}.`,
  apiUnreachable: (detail: string) =>
    `Could not reach the management API: ${detail}`,
} as const;

// The conversation's fetched rows, keyed by resource id, so `resource_table`
// components can join the ids the model references against real data.
export class ToolResultStore {
  private readonly byId = new Map<string, Record<string, unknown>>();

  // Later writes win, merged so a sparse write can't drop fields.
  record(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) this.record(item);
      return;
    }
    if (value === null || typeof value !== "object") return;

    const row = value as Record<string, unknown>;
    if (typeof row.id === "string") {
      this.byId.set(row.id, { ...this.byId.get(row.id), ...row });
    }
    for (const nested of Object.values(row)) {
      if (nested && typeof nested === "object") this.record(nested);
    }
  }

  field(id: string, column: string): unknown {
    return this.byId.get(id)?.[column];
  }
}

const ToolResultsContext = createContext<ToolResultStore | null>(null);

export const ToolResultsProvider = ToolResultsContext.Provider;

export function useToolResults(): ToolResultStore {
  const toolResults = useContext(ToolResultsContext);
  if (!toolResults) {
    throw new Error("assistant hooks must be used within the assistant provider");
  }
  return toolResults;
}

// "My peers" needs to know which user is at the keyboard.
function markOwnership(value: unknown, userId?: string, kind?: string): unknown {
  if (!userId) return value;
  if (Array.isArray(value)) {
    return value.map((row) => markOwnership(row, userId, kind));
  }
  if (value === null || typeof value !== "object") return value;

  const row = value as Record<string, unknown>;
  if (kind === "user" && typeof row.id === "string") {
    return { ...row, yours: row.id === userId };
  }
  if (typeof row.user_id === "string") {
    return { ...row, yours: row.user_id === userId };
  }
  return value;
}

export function useAssistantTools() {
  const { fetch: netbirdFetch } = useNetBirdFetch(true);
  const { loggedInUser } = useLoggedInUser();
  const router = useRouter();
  const pathname = usePathname();
  const currentUserId = loggedInUser?.id;

  return useCallback(
    async (
      name: string,
      rawInput: unknown,
      toolResults: ToolResultStore,
      redactor: Redactor,
      signal?: AbortSignal,
    ): Promise<ToolOutcome> => {
      const tool = ASSISTANT_TOOLS[name];
      const input = (rawInput ?? {}) as Record<string, unknown>;

      if (tool?.kind === "control-center") {
        // Its inputs nest, so it resolves them itself (resolveDeep).
        return runControlCenterTool(tool.action, input, {
          redactor,
          navigate: (href) => router.push(href),
          onControlCenterPage: pathname === CONTROL_CENTER_HREF,
        });
      }

      if (tool?.kind === "navigation") {
        // The model's `{PEER_1}` becomes the real id the route needs.
        const target = navigateToPage(redactor.resolveInput(input));
        if ("error" in target) return { content: target.error, isError: true };
        router.push(target.href);
        return { content: TEXT.navigated(target.href), isError: false };
      }

      if (tool?.kind !== "management") {
        // Reaching this means the server's registry is ahead of the dashboard.
        return { content: TEXT.unknownTool(name), isError: true };
      }

      try {
        const origin = `${loadNetBirdConfig().apiOrigin}/api`;
        const resolved = redactor.resolveInput(input);
        const res = await netbirdFetch(
          `${origin}${tool.action.path(resolved)}`,
          {
            method: "GET",
            signal,
          },
        );
        if (!res.ok) {
          return { content: TEXT.requestFailed(res.status), isError: true };
        }

        const raw = await res.json();
        const selected = tool.action.select ? tool.action.select(raw) : raw;
        const owned = markOwnership(
          selected,
          currentUserId,
          tool.action.redact?.handle,
        );
        // Real rows for `resource_table` joins; only the redacted copy leaves
        // the browser (and is what every transcript resend replays).
        toolResults.record(owned);
        const safe = tool.action.redact
          ? redactor.redact(owned, tool.action.redact)
          : owned;

        return { content: JSON.stringify(safe), isError: false };
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw err;
        return {
          content: TEXT.apiUnreachable((err as Error).message),
          isError: true,
        };
      }
    },
    [netbirdFetch, currentUserId, router, pathname],
  );
}
