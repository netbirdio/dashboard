import useFetchApi, { useApiCall } from "@utils/api";
import { merge, sortBy, unionBy } from "lodash";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
};

const GroupContext = React.createContext(
  {} as {
    groups: Group[] | undefined;
    refresh: () => void;
    dropdownOptions: Group[];
    setDropdownOptions: React.Dispatch<React.SetStateAction<Group[]>>;
    addDropdownOptions: (options: Group[]) => void;
    isLoading: boolean;
    createOrUpdate: (group: Group) => Promise<Group>;
    reset: () => void;
    updateGroupDropdown: (oldGroupName: string, newGroup: Group) => void;
  },
);

export default function GroupsProvider({ children }: Props) {
  const path = usePathname();
  const { permission } = useLoggedInUser();

  return path === "/peers" && permission.dashboard_view == "blocked" ? (
    <>{children}</>
  ) : (
    <GroupsProviderContent>{children}</GroupsProviderContent>
  );
}

export function GroupsProviderContent({ children }: Props) {
  const { data: groups, mutate, isLoading } = useFetchApi<Group[]>("/groups");
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
    let peers = group?.peers?.map((p) => {
      let isString = typeof p === "string";
      if (isString) return p;
      let peer = p as Peer;
      return peer.id;
    }) as string[];

    if (group.name === "All") return Promise.resolve(group);

    const groupID =
      group?.id ?? groups?.find((g) => g.name === group.name)?.id ?? undefined;

    if (groupID) {
      return groupRequest.put(
        {
          name: group.name,
          peers: peers,
        },
        `/${group.id}`,
      );
    } else {
      return groupRequest.post({
        name: group.name,
        peers: peers,
      });
    }
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        refresh,
        dropdownOptions,
        setDropdownOptions,
        addDropdownOptions,
        isLoading,
        createOrUpdate,
        reset,
        updateGroupDropdown,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => React.useContext(GroupContext);
