"use client";

import { Callout } from "@components/Callout";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import { PlaygroundRequest, PlaygroundResponse, usePlaygroundApi } from "./api";
import PlaygroundPrincipalSelector, {
  PlaygroundPrincipalSelection,
} from "./PlaygroundPrincipalSelector";
import PlaygroundRequestEditor, {
  DEFAULT_PLAYGROUND_REQUEST,
  RawPlaygroundRequest,
  validatePlaygroundRequest,
} from "./PlaygroundRequestEditor";
import PlaygroundResult from "./PlaygroundResult";

export default function AgentNetworkPlayground() {
  const { permission } = usePermissions();
  const { users = [], isLoading: usersLoading } = useUsers();
  const { peers = [], isLoading: peersLoading } = usePeers();
  const { groups = [], isLoading: groupsLoading } = useGroups();
  const { settings, settingsLoading } = useAIProviders();
  const api = usePlaygroundApi();
  const canUsePeer = Boolean(
    permission?.peers?.read && permission?.users?.read,
  );
  const canUseGroup = Boolean(permission?.groups?.read);
  const [principal, setPrincipal] = useState<PlaygroundPrincipalSelection>({
    mode: canUsePeer ? "peer" : "group",
  });
  const [request, setRequest] = useState<RawPlaygroundRequest>(
    DEFAULT_PLAYGROUND_REQUEST,
  );
  const [result, setResult] = useState<PlaygroundResponse>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (principal.mode === "peer" && !canUsePeer && canUseGroup) {
      setPrincipal({ mode: "group" });
    } else if (principal.mode === "group" && !canUseGroup && canUsePeer) {
      setPrincipal({ mode: "peer" });
    }
  }, [canUseGroup, canUsePeer, principal.mode]);

  const validationError = useMemo(
    () => validatePlaygroundRequest(request),
    [request],
  );
  const principalID =
    principal.mode === "peer" ? principal.peer?.id : principal.group?.id;
  const loading =
    usersLoading || peersLoading || groupsLoading || settingsLoading;
  const canRun =
    !running &&
    !loading &&
    Boolean(settings) &&
    Boolean(principalID) &&
    !validationError;

  const run = async () => {
    if (!canRun || !principalID) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setError(undefined);
    const payload: PlaygroundRequest = {
      principal: { kind: principal.mode, id: principalID },
      method: request.method,
      path: request.path,
      headers: request.headers.map((header) => ({
        name: header.name,
        values: [header.value],
      })),
      body: request.body,
    };
    try {
      const response = await api.post(payload, "", {
        signal: controller.signal,
      });
      setResult(response);
    } catch (cause) {
      if (!controller.signal.aborted) {
        const apiError = cause as { message?: string; requestId?: string };
        setError(
          `${apiError.message || "Playground request failed."}${
            apiError.requestId ? ` Request ID: ${apiError.requestId}` : ""
          }`,
        );
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = undefined;
      }
      setRunning(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!settings && !settingsLoading && (
        <div role="alert">
          <Callout variant="warning">
            Configure the Agent Network endpoint and connect a
            playground-capable proxy before running a request.
          </Callout>
        </div>
      )}
      <Callout variant="warning">
        This sends a real provider request. It can incur cost and updates usage,
        budgets, and access logs for the emulated identity.
      </Callout>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
        <div
          role="region"
          aria-label="Request builder"
          className="flex min-w-0 flex-col gap-6"
        >
          <PlaygroundPrincipalSelector
            value={principal}
            onChange={setPrincipal}
            users={users}
            peers={peers}
            groups={groups}
            canUsePeer={canUsePeer}
            canUseGroup={canUseGroup}
            disabled={running}
          />

          <PlaygroundRequestEditor
            value={request}
            onChange={setRequest}
            disabled={running}
            error={validationError}
            running={running}
            canRun={canRun}
            onRun={run}
            onCancel={() => controllerRef.current?.abort()}
          />
        </div>
        <PlaygroundResult result={result} running={running} error={error} />
      </div>
    </div>
  );
}
