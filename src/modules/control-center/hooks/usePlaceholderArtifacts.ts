import { useCallback } from "react";
import { mutate } from "swr";
import { useApiCall } from "@utils/api";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";

// Real API objects a server/agent placeholder creates: a hidden throwaway group
// the key auto-assigns to match the registering peer, and the setup key.
export type PlaceholderArtifacts = {
  boundGroupId?: string;
  setupKeyId?: string;
};

export function usePlaceholderArtifacts() {
  const groupRequest = useApiCall<Group>("/groups", true);
  const keyRequest = useApiCall<SetupKey>("/setup-keys", true);

  // The API refuses to delete a group still linked to a setup key, hence the
  // unlink-first order below.
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
          // Detach first: the peer loses the membership even if the delete fails.
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

        // The matched peer still carries the deleted group until a refresh.
        void mutate("/peers");
        void mutate("/groups");
      })();
    },
    [groupRequest, keyRequest],
  );
}
