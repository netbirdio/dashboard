"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import useFetchApi, { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { IconCircleX } from "@tabler/icons-react";
import { Edge, Node, useReactFlow } from "@xyflow/react";
import {
  NetCodeAccountSpec,
  NetCodeChangeset,
  NetCodeChangesetListResponse,
  NetCodeCommit,
  NetCodeImportResult,
} from "@/interfaces/NetCode";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  DraftChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  clearDraftStorage,
  loadActiveDraft,
  saveActiveDraft,
  saveDraftCanvas,
  saveDraftChanges,
} from "@/modules/control-center/draft/draft-storage";
import { changesToSpec } from "@/modules/control-center/netcode/changesToSpec";

// Server-side named drafts: the draft changeset (and a canvas snapshot) is
// persisted as a netcode changeset so drafts survive reloads and machines,
// and Deploy commits the changeset — the backend diffs, validates and
// applies the desired state.

interface DraftAttachment {
  changes: DraftChange[];
  canvas: { nodes: Node[]; edges: Edge[] } | null;
}

interface NetcodeDraftContextType {
  drafts: NetCodeChangeset[];
  activeDraft: NetCodeChangeset | null;
  draftName: string;
  setDraftName: (name: string) => void;
  saveDraft: (name?: string) => Promise<NetCodeChangeset | undefined>;
  openDraft: (id: string) => Promise<void>;
  deleteDraft: (id: string) => void;
  clearActiveDraft: () => void;
  deployDraft: () => Promise<boolean>;
  isSaving: boolean;
  isDeploying: boolean;
}

const NetcodeDraftContext = createContext<NetcodeDraftContextType | null>(
  null,
);

export function useNetcodeDraft(): NetcodeDraftContextType {
  const ctx = useContext(NetcodeDraftContext);
  if (!ctx) {
    throw new Error(
      "useNetcodeDraft must be used within NetcodeDraftProvider",
    );
  }
  return ctx;
}

const setReplacer = (_key: string, value: unknown) =>
  value instanceof Set ? Array.from(value) : value;

export function NetcodeDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDraft, setIsDraft, newDraftSession } = useDraftMode();
  const { changes, replaceChanges } = useDraftChangeset();
  const { networkResources } = useControlCenterData();
  const { mutate } = useSWRConfig();
  const reactFlow = useReactFlow();

  const exportRequest = useApiCall<NetCodeAccountSpec>("/netcode/export");
  const importRequest = useApiCall<NetCodeImportResult>("/netcode/import");
  const changesetRequest = useApiCall<NetCodeChangeset>("/netcode/changesets");
  const attachmentRequest = useApiCall<DraftAttachment | null>(
    "/netcode/changesets",
  );
  const commitRequest = useApiCall<NetCodeCommit>("/netcode/changesets");

  const [activeDraft, setActiveDraft] = useState<NetCodeChangeset | null>(
    null,
  );
  // Survives a reload so the resumed draft stays bound to its changeset
  const [activeDraftRef, setActiveDraftRef] = useState(() => loadActiveDraft());
  const [draftName, setDraftName] = useState(
    () => loadActiveDraft()?.name ?? "Untitled Draft",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const { data: draftsResponse, mutate: refreshDrafts } =
    useFetchApi<NetCodeChangesetListResponse>(
      "/netcode/changesets",
      true,
      false,
      isDraft,
    );

  const drafts = useMemo(
    () =>
      (draftsResponse?.changesets ?? []).filter(
        // Only Control Center drafts — changesets staged via the netcode YAML
        // workflow carry no attachment and must not be editable here
        (c) => c.status !== "committed" && !!c.metadata?.attachment,
      ),
    [draftsResponse],
  );

  const bindActiveDraft = useCallback((changeset: NetCodeChangeset) => {
    setActiveDraft(changeset);
    const ref = { id: changeset.id, name: changeset.name };
    setActiveDraftRef(ref);
    saveActiveDraft(ref);
  }, []);

  const clearActiveDraft = useCallback(() => {
    setActiveDraft(null);
    setActiveDraftRef(null);
    saveActiveDraft(null);
    setDraftName("Untitled Draft");
  }, []);

  // After a reload the changeset id is known from storage but its object is
  // not — re-fetch it so saves update that draft instead of forking a new one
  useEffect(() => {
    if (!isDraft || activeDraft || !activeDraftRef) return;
    let cancelled = false;
    changesetRequest
      .get(`/${activeDraftRef.id}`)
      .then((changeset) => {
        if (cancelled) return;
        setActiveDraft(changeset);
        setDraftName(changeset.name || activeDraftRef.name);
      })
      .catch(() => {
        // The draft is gone server-side — drop the stale binding
        if (!cancelled) clearActiveDraft();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, activeDraft, activeDraftRef]);

  const persistDraft = useCallback(
    async (name?: string): Promise<NetCodeChangeset> => {
      const effectiveName = (name ?? draftName).trim() || "Untitled Draft";
      const exported = await exportRequest.get("?format=json");
      const spec = changesToSpec(exported, changes, { networkResources });

      let changesetId = activeDraft?.id;
      if (changesetId) {
        await changesetRequest.put(
          spec,
          `/${changesetId}?name=${encodeURIComponent(effectiveName)}`,
        );
      } else {
        const result = await importRequest.post(
          spec,
          `?name=${encodeURIComponent(effectiveName)}`,
        );
        changesetId = result.changesetId;
      }

      const attachment: DraftAttachment = {
        changes,
        canvas: isDraft
          ? { nodes: reactFlow.getNodes(), edges: reactFlow.getEdges() }
          : null,
      };
      await attachmentRequest.put(
        JSON.parse(JSON.stringify(attachment, setReplacer)),
        `/${changesetId}/attachment`,
      );

      const changeset = await changesetRequest.get(`/${changesetId}`);
      bindActiveDraft(changeset);
      setDraftName(changeset.name || effectiveName);
      refreshDrafts();
      return changeset;
    },
    [
      draftName,
      exportRequest,
      changes,
      networkResources,
      activeDraft,
      changesetRequest,
      importRequest,
      attachmentRequest,
      isDraft,
      reactFlow,
      refreshDrafts,
      bindActiveDraft,
    ],
  );

  const saveDraft = useCallback(
    async (name?: string) => {
      if (isSaving || isDeploying) return undefined;
      setIsSaving(true);
      try {
        const promise = persistDraft(name);
        notify({
          title: "Save Draft",
          description: "Draft was saved successfully.",
          loadingMessage: "Saving your draft...",
          promise,
        });
        return await promise.catch(() => undefined);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, isDeploying, persistDraft],
  );

  const openDraft = useCallback(
    async (id: string) => {
      const failed = (description: string) => {
        notify({
          title: "Open Draft",
          description,
          icon: <IconCircleX size={16} />,
          backgroundColor: "bg-red-500",
        });
      };

      let changeset: NetCodeChangeset;
      let attachment: DraftAttachment | null;
      try {
        changeset = await changesetRequest.get(`/${id}`);
        // A failed fetch must never look like an empty draft — saving that
        // would overwrite the changeset's real contents
        attachment = await attachmentRequest.get(`/${id}/attachment`);
      } catch {
        failed("Failed to load the draft contents. Nothing was changed.");
        return;
      }

      if (!Array.isArray(attachment?.changes)) {
        failed(
          "This changeset was not created in the Control Center and cannot be edited here.",
        );
        return;
      }

      const restoredChanges = attachment.changes as DraftChange[];

      clearDraftStorage();
      replaceChanges(restoredChanges);
      saveDraftChanges(restoredChanges);
      if (attachment.canvas) {
        saveDraftCanvas(attachment.canvas.nodes, attachment.canvas.edges);
      }

      bindActiveDraft(changeset);
      setDraftName(changeset.name || "Untitled Draft");
      setIsDraft(true);
      newDraftSession();
    },
    [
      changesetRequest,
      attachmentRequest,
      replaceChanges,
      setIsDraft,
      newDraftSession,
      bindActiveDraft,
    ],
  );

  const deleteDraft = useCallback(
    (id: string) => {
      changesetRequest.del("", `/${id}`).then(() => {
        if (activeDraft?.id === id) clearActiveDraft();
        refreshDrafts();
      });
    },
    [changesetRequest, activeDraft, clearActiveDraft, refreshDrafts],
  );

  const deployDraft = useCallback(async (): Promise<boolean> => {
    if (isSaving || isDeploying) return false;
    setIsDeploying(true);
    try {
      const changeset = await persistDraft().catch((err) => {
        notify({
          title: "Deploy",
          description:
            (err as { message?: string })?.message ?? "Saving the draft failed.",
          icon: <IconCircleX size={16} />,
          backgroundColor: "bg-red-500",
        });
        return null;
      });
      if (!changeset) return false;

      if (changeset.validation_status === "invalid") {
        const firstError = changeset.validation_errors?.find(
          (e) => e.severity === "error",
        );
        notify({
          title: "Deploy",
          description: `Draft is invalid: ${
            firstError?.message ?? "validation failed"
          }`,
          icon: <IconCircleX size={16} />,
          backgroundColor: "bg-red-500",
        });
        return false;
      }

      const promise = commitRequest.post(
        { message: `Deploy draft "${changeset.name}" from Control Center` },
        `/${changeset.id}/commit`,
      );
      notify({
        title: "Deploy",
        description: "Draft changes were applied to your network.",
        loadingMessage: "Deploying changes...",
        promise,
      });

      try {
        await promise;
      } catch {
        return false;
      }

      await Promise.all([
        mutate("/groups"),
        mutate("/policies"),
        mutate("/networks"),
        mutate("/networks/resources"),
      ]).catch(() => {});
      clearActiveDraft();
      refreshDrafts();
      return true;
    } finally {
      setIsDeploying(false);
    }
  }, [
    isSaving,
    isDeploying,
    persistDraft,
    commitRequest,
    mutate,
    clearActiveDraft,
    refreshDrafts,
  ]);

  const value = useMemo(
    () => ({
      drafts,
      activeDraft,
      draftName,
      setDraftName,
      saveDraft,
      openDraft,
      deleteDraft,
      clearActiveDraft,
      deployDraft,
      isSaving,
      isDeploying,
    }),
    [
      drafts,
      activeDraft,
      draftName,
      saveDraft,
      openDraft,
      deleteDraft,
      clearActiveDraft,
      deployDraft,
      isSaving,
      isDeploying,
    ],
  );

  return (
    <NetcodeDraftContext.Provider value={value}>
      {children}
    </NetcodeDraftContext.Provider>
  );
}
