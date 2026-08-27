import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { useCallback, useSyncExternalStore } from "react";
import { mutate } from "swr";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";

// Real API objects a server/agent placeholder creates: a throwaway group the key
// auto-assigns to match the registering peer, and the setup key.
export type PlaceholderArtifacts = {
  boundGroupId?: string;
  setupKeyId?: string;
};

// Every artifact this draft session created, per owner. Teardown reads THIS, not
// the canvas: a removed placeholder has no node. Each owner keeps a LIST (last =
// current): undo can make a reopened Install mint a second key while the first is real.
const registered = new Map<string, PlaceholderArtifacts[]>();

// A plain module Map can't drive a re-render, so the registry publishes its emptiness.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const publish = () => listeners.forEach((fn) => fn());
const isEmpty = () => registered.size === 0;

const hasArtifacts = (a?: PlaceholderArtifacts) =>
  !!(a?.boundGroupId || a?.setupKeyId);

// Callers pass whatever the node data holds, and after an undo that can be an
// explicitly undefined field — which must not erase what the registry knows.
const presentFields = (a?: PlaceholderArtifacts): PlaceholderArtifacts => ({
  ...(a?.boundGroupId ? { boundGroupId: a.boundGroupId } : {}),
  ...(a?.setupKeyId ? { setupKeyId: a.setupKeyId } : {}),
});

// A setup-key PUT REPLACES the key, so it must carry every field the create sent —
// the same body SetupKeyActionCell and SetupKeyGroupsCell send.
const setupKeyUpdateBody = (
  key: SetupKey,
  patch: { revoked?: boolean; auto_groups?: string[] },
) => ({
  name: key.name,
  type: key.type,
  expires_in: key.expires_in,
  revoked: patch.revoked ?? key.revoked,
  auto_groups: patch.auto_groups ?? key.auto_groups ?? [],
  usage_limit: key.usage_limit,
  ephemeral: key.ephemeral,
  allow_extra_dns_labels: key.allow_extra_dns_labels,
});

export function usePlaceholderArtifacts() {
  const groupRequest = useApiCall<Group>("/groups", true);
  const keyRequest = useApiCall<SetupKey>("/setup-keys", true);

  // The API refuses to delete a group still linked to a key but not the reverse, so
  // the KEY goes first. No step aborts the rest; each records its own failure.
  const deleteNow = useCallback(
    async ({ boundGroupId, setupKeyId }: PlaceholderArtifacts) => {
      const failed: string[] = [];
      const readKey = () =>
        setupKeyId
          ? keyRequest.get(`/${setupKeyId}`).catch(() => undefined)
          : Promise.resolve(undefined);
      let key = await readKey();
      let keyUsable = false;

      let keyGone = true;
      if (setupKeyId) {
        keyGone = await keyRequest
          .del("", `/${setupKeyId}`)
          .then(() => true)
          .catch(() => false);
      }

      // Revoking closes the 24h window a failed delete leaves open, and the same PUT
      // takes off the auto_groups link the group delete would be refused for.
      if (setupKeyId && !keyGone) {
        if (!key) key = await readKey();
        const salvaged = key
          ? await keyRequest
              .put(
                setupKeyUpdateBody(key, {
                  revoked: true,
                  auto_groups: (key.auto_groups ?? []).filter(
                    (g) => g !== boundGroupId,
                  ),
                }),
                `/${setupKeyId}`,
              )
              .then(() => true)
              .catch(() => false)
          : false;
        // Revoked, it can register nothing and is inert clutter, not a leftover the user
        // has to act on. Only a key that is still live is worth a toast.
        if (!salvaged) {
          keyUsable = true;
          failed.push(`setup key “${key?.name ?? setupKeyId}”`);
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
        const ok = await groupRequest
          .del("", `/${boundGroupId}`)
          .then(() => true)
          .catch(() => false);
        if (!ok) failed.push(`group “${group?.name ?? boundGroupId}”`);
      }

      if (failed.length > 0) {
        notify({
          title: "Draft cleanup",
          description: `Could not delete the temporary ${failed.join(
            " and ",
          )}. Remove it manually.${
            keyUsable
              ? " The setup key could not be revoked either, so it stays usable until it expires."
              : ""
          }`,
          backgroundColor: "bg-red-500",
        });
      }

      // The matched peer still carries the deleted group until a refresh.
      void mutate("/peers");
      void mutate("/groups");
    },
    [groupRequest, keyRequest],
  );

  const registerArtifacts = useCallback(
    (ownerId: string, artifacts: PlaceholderArtifacts) => {
      const incoming = presentFields(artifacts);
      if (!hasArtifacts(incoming)) return;
      const entries = [...(registered.get(ownerId) ?? [])];
      // Undo replays can re-register ids from ANY point in the history, so a known id
      // is matched across every generation — a fresh entry would make flush delete it twice.
      const keyAt = incoming.setupKeyId
        ? entries.findIndex((e) => e.setupKeyId === incoming.setupKeyId)
        : -1;
      const groupAt = incoming.boundGroupId
        ? entries.findIndex((e) => e.boundGroupId === incoming.boundGroupId)
        : -1;
      const keyKnown = !incoming.setupKeyId || keyAt >= 0;
      const groupKnown = !incoming.boundGroupId || groupAt >= 0;
      // Nothing new: the registry's own placement is more current than a
      // replayed node snapshot, so it is not rearranged either.
      if (keyKnown && groupKnown) return;

      if (keyAt >= 0) {
        if (!entries[keyAt].boundGroupId) {
          entries[keyAt] = {
            ...entries[keyAt],
            boundGroupId: incoming.boundGroupId,
          };
        } else {
          entries.push({ boundGroupId: incoming.boundGroupId });
        }
      } else if (groupAt >= 0) {
        // A reused group re-keyed: the pair must share a generation — teardown
        // deletes a generation's key before its group.
        if (!entries[groupAt].setupKeyId) {
          entries[groupAt] = {
            ...entries[groupAt],
            setupKeyId: incoming.setupKeyId,
          };
        } else {
          const { boundGroupId: _moved, ...keyOnly } = entries[groupAt];
          entries[groupAt] = keyOnly;
          entries.push(incoming);
        }
      } else {
        // A DIFFERENT id is a new generation, not a correction: the superseded object
        // moves down the list for teardown instead of being overwritten.
        const current = entries[entries.length - 1];
        const conflicts =
          !!current &&
          ((!!incoming.setupKeyId && !!current.setupKeyId) ||
            (!!incoming.boundGroupId && !!current.boundGroupId));
        if (!current || conflicts) {
          entries.push(incoming);
        } else {
          entries[entries.length - 1] = { ...current, ...incoming };
        }
      }
      registered.set(ownerId, entries);
      publish();
    },
    [],
  );

  const deleteArtifacts = useCallback(
    (ownerId: string, artifacts?: PlaceholderArtifacts) => {
      const entries = registered.get(ownerId) ?? [];
      registered.delete(ownerId);
      publish();
      // Ids the caller read off the node that the registry never saw still get
      // torn down; known ids are skipped so nothing is deleted twice.
      const extra = presentFields(artifacts);
      const leftover: PlaceholderArtifacts = {
        ...(extra.setupKeyId &&
        !entries.some((e) => e.setupKeyId === extra.setupKeyId)
          ? { setupKeyId: extra.setupKeyId }
          : {}),
        ...(extra.boundGroupId &&
        !entries.some((e) => e.boundGroupId === extra.boundGroupId)
          ? { boundGroupId: extra.boundGroupId }
          : {}),
      };
      const targets = hasArtifacts(leftover)
        ? [...entries, leftover]
        : entries;
      targets.forEach((t) => hasArtifacts(t) && void deleteNow(t));
    },
    [deleteNow],
  );

  // Artifacts stay registered so undo can bring the node back, but the KEY is a live
  // credential: revoking now is reversible in a way deleting is not.
  const revokeSetupKey = useCallback(
    (setupKeyId?: string) => {
      if (!setupKeyId) return;
      void (async () => {
        const key = await keyRequest.get(`/${setupKeyId}`).catch(() => undefined);
        if (!key || key.revoked) return;
        await keyRequest
          .put(setupKeyUpdateBody(key, { revoked: true }), `/${setupKeyId}`)
          .catch(async () => {
            // A racing teardown deletes the key underneath this PUT. Re-read before
            // reporting: the toast must not claim a deleted key is still usable.
            const still = await keyRequest
              .get(`/${setupKeyId}`)
              .catch(() => undefined);
            if (!still || still.revoked) return;
            notify({
              title: "Draft cleanup",
              description: `Could not revoke the temporary setup key “${
                still.name ?? key.name ?? setupKeyId
              }”. It stays usable until the draft is closed.`,
              backgroundColor: "bg-red-500",
            });
          });
      })();
    },
    [keyRequest],
  );

  // Leaving draft: everything still registered is garbage.
  const flushArtifacts = useCallback(() => {
    const pending = Array.from(registered.values()).flat();
    registered.clear();
    publish();
    pending.forEach((a) => hasArtifacts(a) && void deleteNow(a));
  }, [deleteNow]);

  // Newest first. The Install modal consults THIS, not node data: undo can strip the
  // id off the node while the key stays live and must be revoked on replacement.
  const registeredSetupKeyId = useCallback((ownerId: string) => {
    const entries = registered.get(ownerId) ?? [];
    for (let i = entries.length - 1; i >= 0; i--) {
      const id = entries[i].setupKeyId;
      if (id) return id;
    }
    return undefined;
  }, []);

  return {
    registerArtifacts,
    deleteArtifacts,
    revokeSetupKey,
    flushArtifacts,
    registeredSetupKeyId,
  };
}

// True while the registry holds artifacts nothing on the canvas owns. Separate
// hook: only the leave guard needs to re-render on it.
export function usePendingArtifacts(): boolean {
  return !useSyncExternalStore(subscribe, isEmpty, isEmpty);
}
