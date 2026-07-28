import { useCallback, useMemo, useRef } from "react";
import {
  ErrorResponse,
  mergeUrlParams,
  useApiErrorHandling,
  useNetBirdFetch,
} from "@utils/api";
import loadConfig from "@utils/config";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import {
  NetCodeAccountSpec,
  NetCodeChangeset,
  NetCodeCommit,
  NetCodeCommitListResponse,
  NetCodeDiffResult,
  NetCodeImportResult,
  NetCodeValidationResult,
} from "@/interfaces/NetCode";

// The netcode config endpoints speak YAML/plain text, which useApiCall cannot
// express (it always JSON.stringify()s the body and JSON.parse()s the
// response). Going through useNetBirdFetch directly means the two things
// apiRequest does around it must be reproduced here: merging the global API
// params (the MSP account switch — without it every call would resolve to the
// parent account) and routing failures through the shared error handler.

const config = loadConfig();

export type ExportFormat = "yaml" | "json";

export type ExportOptions = {
  format?: ExportFormat;
  pretty?: boolean;
  resource?: string;
};

export function useNetcodeApi() {
  const { fetch } = useNetBirdFetch();
  const handleErrors = useApiErrorHandling();
  const { globalApiParams } = useApplicationContext();

  // useNetBirdFetch returns a fresh closure every render; holding it in a ref
  // keeps the returned API object identity-stable, so consumers can depend on
  // these functions in effects without refetch loops.
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;
  const handleErrorsRef = useRef(handleErrors);
  handleErrorsRef.current = handleErrors;

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetchRef.current(
        `${config.apiOrigin}/api${mergeUrlParams(path, globalApiParams)}`,
        init,
      );
      // An expired token short-circuits into login() and resolves undefined
      if (!res?.ok) {
        let message = res?.statusText ?? "token expired";
        try {
          const body = await res?.json();
          message = body?.message ?? message;
        } catch {
          // Non-JSON error body — keep the status text
        }
        const error = { code: res?.status ?? 401, message } as ErrorResponse;
        await handleErrorsRef.current(error).catch(() => {});
        return Promise.reject(error);
      }
      return res;
    },
    [globalApiParams],
  );

  return useMemo(
    () => ({
      // Raw configuration text of the live account, for download
      exportConfig: async (options: ExportOptions = {}): Promise<string> => {
        const params = new URLSearchParams();
        params.set("format", options.format ?? "yaml");
        if (options.pretty !== false) params.set("pretty", "true");
        const path = options.resource
          ? `/netcode/export/${options.resource}`
          : "/netcode/export";
        const res = await request(`${path}?${params.toString()}`);
        return res.text();
      },

      // Configuration text at a specific commit
      exportCommit: async (commitId: string): Promise<string> => {
        const res = await request(`/netcode/commits/${commitId}/export`);
        return res.text();
      },

      // Parsed configuration at a specific commit, for rendering it on canvas
      exportCommitSpec: async (
        commitId: string,
      ): Promise<NetCodeAccountSpec> => {
        const res = await request(
          `/netcode/commits/${commitId}/export?format=json`,
        );
        const body = await res.text();
        try {
          return JSON.parse(body);
        } catch {
          // A management server built before JSON commit export answers YAML
          return Promise.reject({
            code: 0,
            message:
              "This management server cannot return a commit snapshot as JSON yet — rebuild and restart it to use the history timeline.",
          });
        }
      },

      // Validates configuration text without storing anything
      validateConfig: async (
        content: string,
      ): Promise<NetCodeValidationResult> => {
        const res = await request("/netcode/validate", {
          method: "POST",
          body: content,
          headers: { "Content-Type": "text/plain" },
        });
        return res.json();
      },

      // Stages configuration text as a new changeset
      importConfig: async (
        content: string,
        name?: string,
        description?: string,
      ): Promise<NetCodeImportResult> => {
        const params = new URLSearchParams();
        if (name) params.set("name", name);
        if (description) params.set("description", description);
        const query = params.toString();
        const res = await request(
          `/netcode/import${query ? `?${query}` : ""}`,
          {
            method: "POST",
            body: content,
            headers: { "Content-Type": "text/plain" },
          },
        );
        return res.json();
      },

      getChangeset: async (id: string): Promise<NetCodeChangeset> => {
        const res = await request(`/netcode/changesets/${id}`);
        return res.json();
      },

      getChangesetDiff: async (id: string): Promise<NetCodeDiffResult> => {
        const res = await request(`/netcode/changesets/${id}/diff`);
        return res.json();
      },

      commitChangeset: async (
        id: string,
        message: string,
      ): Promise<NetCodeCommit> => {
        const res = await request(`/netcode/changesets/${id}/commit`, {
          method: "POST",
          body: JSON.stringify({ message }),
          headers: { "Content-Type": "application/json" },
        });
        return res.json();
      },

      deleteChangeset: async (id: string): Promise<void> => {
        await request(`/netcode/changesets/${id}`, { method: "DELETE" });
      },

      listCommits: async (
        limit = 50,
        offset = 0,
      ): Promise<NetCodeCommitListResponse> => {
        const res = await request(
          `/netcode/commits?limit=${limit}&offset=${offset}`,
        );
        return res.json();
      },

      getCommit: async (id: string): Promise<NetCodeCommit> => {
        const res = await request(`/netcode/commits/${id}`);
        return res.json();
      },

      // Diffs two refs; a ref is a commit id or "current"
      diffRefs: async (from: string, to: string): Promise<NetCodeDiffResult> => {
        const res = await request("/netcode/diff", {
          method: "POST",
          body: JSON.stringify({ from, to, format: "unified" }),
          headers: { "Content-Type": "application/json" },
        });
        return res.json();
      },
    }),
    [request],
  );
}

// Triggers a browser download of configuration text
export function downloadConfigFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
