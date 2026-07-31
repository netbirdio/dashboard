import { useCallback } from "react";
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

  // Fire-and-forget: a failed delete only leaves an unused artifact behind.
  return useCallback(
    ({ boundGroupId, setupKeyId }: PlaceholderArtifacts) => {
      if (setupKeyId) keyRequest.del("", `/${setupKeyId}`).catch(() => {});
      if (boundGroupId) groupRequest.del("", `/${boundGroupId}`).catch(() => {});
    },
    [groupRequest, keyRequest],
  );
}
