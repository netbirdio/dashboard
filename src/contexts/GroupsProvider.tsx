import useFetchApi, { useApiCall } from "@utils/api";
import { toIds } from "@utils/ids";
import { merge, sortBy, unionBy } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group, GroupResource } from "@/interfaces/Group";
import { Peer, PeerWithGroups } from "@/interfaces/Peer";
import { buildGroupsByPeerId } from "@/modules/groups/groupMembers";

type Props = {
  children: React.ReactNode;
};

const GroupContext = React.createContext(
  {} as {
    groups: Group[] | undefined;
    groupsByPeerId: Map<string, Group[]>;
    refresh: () => void;
    dropdownOptions: Group[];
    setDropdownOptions: React.Dispatch<React.SetStateAction<Group[]>>;
    addDropdownOptions: (options: Group[]) => void;
    isLoading: boolean;
    createOrUpdate: (group: Group) => Promise<Group>;
    reset: () => void;
    updateGroupDropdown: (oldGroupName: string, newGroup: Group) => void;
    deleteGroupDropdownOption: (name: string) => void;
  },
);

export default function GroupsProvider({ children }: Props) {
  const { isRestricted, permission } = usePermissions();

  // Restricted users normally get the inert shell, but roles that are
  // restricted yet hold the groups read grant (usage_viewer, which needs
  // group names for the usage filters) still get the real provider — the
  // content gates its fetch on that same grant.
  return isRestricted && !permission.groups.read ? (
    <>{children}</>
  ) : (
    <GroupsProviderContent>{children}</GroupsProviderContent>
  );
}

type ProviderContentProps = {
  children: React.ReactNode;
};

export function GroupsProviderContent({
  children,
}: Readonly<ProviderContentProps>) {
  const { permission } = usePermissions();

  const {
    data: groups,
    mutate,
    isLoading,
  } = useFetchApi<Group[]>("/groups", false, true, permission.groups.read);
  const groupsByPeerId = useMemo(() => buildGroupsByPeerId(groups), [groups]);
  const groupRequest = useApiCall<Group>("/groups", true);
  const [dropdownOptions, setDropdownOptions] = useState<Group[]>([]);

  const refresh = () => {
    if (groups && !isLoading) mutate().then();
  };

  const reset = () => {
    mutate();
    setDropdownOptions([]);
    addDropdownOptions(groups || []);
  };

  const addDropdownOptions = (options: Group[]) => {
    setDropdownOptions((prev) => {
      let union = unionBy(options, prev, "name");
      return sortBy(
        union.map((item) =>
          merge({}, prev.find((p) => p.name === item.name) || {}, item),
        ),
        "name",
      );
    });
  };

  const updateGroupDropdown = (oldGroupName: string, newGroup: Group) => {
    setDropdownOptions((prev) => {
      let updated = prev.map((g) => {
        if (g.name === oldGroupName) {
          return newGroup;
        }
        return g;
      });
      return sortBy(updated, "name");
    });
  };

  // Update dropdown options when groups change
  useEffect(() => {
    if (!groups) return;
    const sortedGroups = sortBy([...groups], "name");
    const dropdownGroups = dropdownOptions.filter((g) => g.keepClientState);
    const union = unionBy(dropdownGroups, sortedGroups, "name");
    addDropdownOptions(union);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const createOrUpdate = async (group: Group) => {
    let peers = toIds(group?.peers);

    let resources = group?.resources?.map((r) => {
      let isString = typeof r === "string";
      if (isString) return r;
      let resource = r as GroupResource;
      return resource.id;
    }) as string[];

    if (group.name === "All") return Promise.resolve(group);

    const groupID =
      group?.id ?? groups?.find((g) => g.name === group.name)?.id ?? undefined;

    if (groupID) {
      return groupRequest.put(
        {
          name: group.name,
          peers: peers,
          resources: resources,
        },
        `/${group.id}`,
      );
    } else {
      return groupRequest.post({
        name: group.name,
        peers: peers,
        resources: resources,
      });
    }
  };

  const deleteGroupDropdownOption = (name: string) => {
    setDropdownOptions((prev) => {
      let updated = prev.filter((g) => g.name !== name);
      return sortBy(updated, "name");
    });
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        groupsByPeerId,
        refresh,
        dropdownOptions,
        setDropdownOptions,
        addDropdownOptions,
        isLoading,
        createOrUpdate,
        reset,
        updateGroupDropdown,
        deleteGroupDropdownOption,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => React.useContext(GroupContext);

const NO_GROUPS: Group[] = [];
const EMPTY_GROUPS_BY_PEER = new Map<string, Group[]>();

/** Groups the given peer belongs to, derived from `/groups`. */
export const useGroupsOfPeer = (peerId?: string): Group[] => {
  const { groupsByPeerId } = useGroups();
  return (peerId && groupsByPeerId?.get(peerId)) || NO_GROUPS;
};

/**
 * Whether the first `/groups` answer has landed. Without the groups grant the
 * provider is an inert shell with nothing to wait for, so it reads as ready.
 */
export const useGroupsLoaded = (): boolean => {
  const { isLoading } = useGroups();
  return !isLoading;
};

/** Peer id to groups lookup, derived from `/groups`. */
export const useGroupsByPeerId = (): Map<string, Group[]> => {
  const { groupsByPeerId } = useGroups();
  return groupsByPeerId ?? EMPTY_GROUPS_BY_PEER;
};

/** Peers decorated with their groups, derived from `/groups`. */
export const usePeersWithGroups = (
  peers?: Peer[],
): PeerWithGroups[] | undefined => {
  const groupsByPeerId = useGroupsByPeerId();
  return useMemo(
    () =>
      peers?.map((peer) => ({
        ...peer,
        groups: (peer.id && groupsByPeerId.get(peer.id)) || [],
      })),
    [peers, groupsByPeerId],
  );
};
