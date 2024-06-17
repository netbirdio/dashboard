import { useApiCall } from "@utils/api";
import { isEmpty } from "lodash";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeerGroups } from "@/contexts/PeerProvider";
import { type Group, type GroupPeer } from "@/interfaces/Group";
import { type Peer } from "@/interfaces/Peer";

type Props = {
  initial?: Group[] | string[];
  peer?: Peer;
};

export default function useGroupHelper({ initial = [], peer }: Props) {
  const groupRequest = useApiCall<Group>("/groups");
  const { mutate } = useSWRConfig();
  const { groups } = useGroups();

  const initialGroups = useMemo(() => {
    if (!initial) return [];
    const isArrayOfStrings = initial.every((item) => typeof item === "string");
    if (!isArrayOfStrings) return initial as Group[];
    const foundGroups = initial
      .map((id) => {
        return groups?.find((g) => g.id === id);
      })
      .filter((g) => g !== undefined) as Group[];
    return foundGroups ?? [];
  }, [groups, initial]);

  const [selectedGroups, setSelectedGroups] = useState<Group[]>(initialGroups);
  const { peerGroups } = usePeerGroups(peer);

  const save = async () => {
    return Promise.all(getAllGroupCalls()).then((groups) => {
      mutate("/groups");
      return groups;
    });
  };

  const getGroupsToUpdate = () => {
    const groupsToUpdate = selectedGroups.filter((group) => {
      const foundGroupInPeer = peerGroups?.find((g) => g.id === group.id);
      return !foundGroupInPeer;
    });
    return groupsToUpdate.map((group) => {
      return {
        name: group.name,
        promise: () => updateOrCreateGroup(group),
      };
    });
  };

  const getAllGroupCalls = () => {
    const groupsToUpdate = getGroupsToUpdate();

    // Remove peer from groups that are not selected
    const groupsToRemove = peerGroups?.filter(
      (group) => !selectedGroups.find((g) => g.id === group.id),
    );

    const updateCalls = groupsToUpdate.map((item) => {
      return item.promise;
    });

    const removeCalls = groupsToRemove?.map((group) => {
      return removePeerFromGroup(group);
    });

    return [...updateCalls.map((c) => c()), ...removeCalls] as Promise<Group>[];
  };

  const removePeerFromGroup = async (g: Group) => {
    const newPeerGroups = g.peers?.filter((p) => {
      const groupPeer = p as GroupPeer;
      return groupPeer.id !== peer?.id;
    });

    return groupRequest.put(
      {
        name: g.name,
        ipv6_enabled: g.ipv6_enabled,
        peers: newPeerGroups
          ? newPeerGroups.map((p) => {
              const groupPeer = p as GroupPeer;
              return groupPeer.id;
            })
          : undefined,
      },
      `/${g.id}`,
    );
  };

  const updateOrCreateGroup = async (selectedGroup: Group) => {
    const groupPeers =
      selectedGroup.peers &&
      selectedGroup.peers
        .map((p) => {
          const groupPeer = p as GroupPeer;
          return groupPeer.id;
        })
        .filter((p) => p !== undefined && p !== null);

    // Update group if it has an id (only when peer prop is passed)
    const hasId = !!selectedGroup.id;
    const peers = isEmpty(groupPeers) ? undefined : groupPeers;

    if (hasId) {
      if (selectedGroup.name == "All" || !peer)
        return Promise.resolve(selectedGroup);
      return groupRequest.put(
        {
          name: selectedGroup.name,
          ipv6_enabled: selectedGroup.ipv6_enabled,
          peers: peers,
        },
        `/${selectedGroup.id}`,
      );
    }

    // Create group if it does not have an id
    return groupRequest
      .post({
        name: selectedGroup.name,
        ipv6_enabled: selectedGroup.ipv6_enabled,
        peers: groupPeers || [],
      })
      .then((group) => {
        setSelectedGroups((prev) => {
          const index = prev.findIndex((g) => g.name === selectedGroup.name);
          const clone = [...prev];
          clone[index] = {
            ...clone[index],
            id: group.id,
            name: group.name,
          };
          return clone;
        });

        return group;
      });
  };

  return [
    selectedGroups,
    setSelectedGroups,
    { save, getAllGroupCalls, getGroupsToUpdate },
  ] as const;
}
