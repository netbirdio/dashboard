import { Group } from "@/interfaces/Group";
import { toIds } from "@/utils/ids";

/** Member ids of a group, whether the API sent ids or legacy objects. */
export const groupPeerIds = (group?: Pick<Group, "peers"> | null): string[] =>
  toIds(group?.peers);

/** Existing members plus the given peers, without duplicates. */
export const addPeersToMembers = (
  members: Group["peers"],
  peerIds: string[],
): string[] => Array.from(new Set([...toIds(members), ...peerIds]));

/** Existing members minus the given peers; everyone else is kept. */
export const removePeersFromMembers = (
  members: Group["peers"],
  peerIds: string[],
): string[] => {
  const remove = new Set(peerIds);
  return toIds(members).filter((id) => !remove.has(id));
};

/** Index groups by member peer id, so a peer's groups are one lookup away. */
export const buildGroupsByPeerId = (
  groups?: Group[] | null,
): Map<string, Group[]> => {
  const map = new Map<string, Group[]>();
  (groups ?? []).forEach((group) => {
    groupPeerIds(group).forEach((peerId) => {
      const list = map.get(peerId);
      if (list) list.push(group);
      else map.set(peerId, [group]);
    });
  });
  return map;
};

/** Groups that have at least one of the given peers as a member. */
export const groupsContainingAnyPeer = (
  groups: Group[] | undefined,
  peerIds: string[],
): Group[] => {
  const wanted = new Set(peerIds);
  return (groups ?? []).filter((group) =>
    groupPeerIds(group).some((id) => wanted.has(id)),
  );
};

/** Copies of the groups with the peers added to their member lists. */
export const withPeersAdded = (groups: Group[], peerIds: string[]): Group[] =>
  groups.map((group) => ({
    ...group,
    peers: addPeersToMembers(group.peers, peerIds),
  }));

/** Copies of the groups with the peers dropped from their member lists. */
export const withPeersRemoved = (groups: Group[], peerIds: string[]): Group[] =>
  groups.map((group) => ({
    ...group,
    peers: removePeersFromMembers(group.peers, peerIds),
  }));
