import { useCallback } from "react";
import { mutate } from "swr";
import { useApiCall } from "@utils/api";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";

// The real API artifacts a server/agent placeholder creates when its setup key
// is generated: a hidden throwaway group (auto-assigned by the key, used to
// match the registering peer) and the one-off setup key itself. Both are
// deleted once the peer is matched OR the draft/placeholder is abandoned — the
// draft never persists them, so nothing should be left behind in the account.
export type PlaceholderArtifacts = {
  boundGroupId?: string;
  setupKeyId?: string;
};

export function usePlaceholderArtifacts() {
  const groupRequest = useApiCall<Group>("/groups", true);
  const keyRequest = useApiCall<SetupKey>("/setup-keys", true);

  // Teardown is ORDERED, not fire-and-forget-in-parallel: by the time the peer
  // is matched the bound group is referenced by the setup key (as an
  // auto_group) and by the peer that just registered with it, and the API
  // refuses to delete a group that is still linked to a setup key. So:
  // unlink it from the key → empty its members → delete the group → delete the
  // key. Every step is silent (no notify, ignoreError) and best-effort: a
  // failure only leaves an unused artifact behind, and the user is mid-draft.
  return useCallback(
    ({ boundGroupId, setupKeyId }: PlaceholderArtifacts) => {
      if (!boundGroupId && !setupKeyId) return;
      void (async () => {
        const key = setupKeyId
          ? await keyRequest.get(`/${setupKeyId}`).catch(() => undefined)
          : undefined;

        if (key && boundGroupId) {
          const autoGroups = key.auto_groups ?? [];
          const remaining = autoGroups.filter((g) => g !== boundGroupId);
          if (remaining.length !== autoGroups.length) {
            await keyRequest
              .put(
                {
                  name: key.name,
                  auto_groups: remaining,
                  revoked: key.revoked,
                },
                `/${setupKeyId}`,
              )
              .catch(() => {});
          }
        }

        if (boundGroupId) {
          // Detach the registered peer before dropping the group, so it loses
          // the throwaway membership even if the delete itself is rejected.
          const group = await groupRequest
            .get(`/${boundGroupId}`)
            .catch(() => undefined);
          if (group && (group.peers?.length ?? 0) > 0) {
            await groupRequest
              .put({ ...group, peers: [] }, `/${boundGroupId}`)
              .catch(() => {});
          }
          await groupRequest.del("", `/${boundGroupId}`).catch(() => {});
        }

        if (setupKeyId) {
          await keyRequest.del("", `/${setupKeyId}`).catch(() => {});
        }

        // The matched peer still carries the (now deleted) draft group until
        // the caches refresh.
        void mutate("/peers");
        void mutate("/groups");
      })();
    },
    [groupRequest, keyRequest],
  );
}
