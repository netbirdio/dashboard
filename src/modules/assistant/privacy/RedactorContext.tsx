/**
 * Per-conversation state shared between the runtime and the renderers:
 *
 *  - the `Redactor`, which mints placeholders while redacting tool results and
 *    holds the reverse map used to restore them for display;
 *  - the `ResourceStore`, which keeps the redacted rows so `resource_table` can
 *    join the ids the server sends against real fetched data.
 *
 * Both must be the *same instances* the runtime writes to. A second Redactor
 * would have an empty reverse map and render raw `{PEER_1}` tokens to the user;
 * a second store would render an empty table.
 */
"use client";

import { createContext, useContext } from "react";
import type { ResourceStore } from "../data/resourceStore";
import type { Redactor } from "./redaction";

export interface AssistantSession {
  redactor: Redactor;
  resources: ResourceStore;
}

const SessionContext = createContext<AssistantSession | null>(null);

export const RedactorProvider = SessionContext.Provider;

function useSession(): AssistantSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error(
      "assistant hooks must be used within the assistant provider",
    );
  }
  return session;
}

/** The conversation's redactor. */
export function useRedactor(): Redactor {
  return useSession().redactor;
}

/** The conversation's fetched-row store, for joining table ids to data. */
export function useResourceStore(): ResourceStore {
  return useSession().resources;
}

/**
 * Restores placeholder tokens in model output to the real display names the
 * user recognises. Safe on text containing no placeholders.
 */
export function useRestorePlaceholders(): (text: string) => string {
  const redactor = useRedactor();
  return (text: string) => redactor.restore(text);
}
