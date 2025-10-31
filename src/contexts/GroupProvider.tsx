import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";

type Props = {
  group: Group;
  children?: React.ReactNode;
  isDetailPage?: boolean;
};

const GroupContext = React.createContext(
  {} as {
    group: Group;
    deleteGroup: () => Promise<void>;
    renameGroup: (name: string) => Promise<void>;
    isRegularGroup: boolean;
    isIntegrationGroup: boolean;
    isJWTGroup: boolean;
    isAllowedToDelete: boolean;
    isAllowedToRename: boolean;
    openGroupRenameModal?: () => void;
    addPeersToGroup: (peers: Peer[]) => Promise<void>;
    removePeersFromGroup: (peer: Peer[]) => Promise<void>;
    addUsersToGroup: (users: User[]) => Promise<void>;
    removeUsersFromGroup: (users: User[]) => Promise<void>;
  },
);

export const GroupProvider = ({
  group,
  children,
  isDetailPage = true,
}: Props) => {
  const { permission } = usePermissions();
  const [groupNameModal, setGroupNameModal] = useState(false);
  const { mutate } = useSWRConfig();
  const { deleteGroupDropdownOption, updateGroupDropdown } = useGroups();
  const groupRequest = useApiCall<Group>("/groups/" + group.id);
  const userRequest = useApiCall<User>("/users");
  const { confirm } = useDialog();
  const { isRegularGroup, isIntegrationGroup, isJWTGroup } =
    useGroupIdentification({
      id: group?.id,
      issued: group?.issued,
    });

  const isAllowedToRename = isRegularGroup && permission?.groups?.update;
  const isAllowedToDelete = !isIntegrationGroup && permission?.groups?.delete;

  const handleDelete = async () => {
    if (!isAllowedToDelete) return Promise.reject("Not allowed to delete");

    const promise = groupRequest.del().then(() => {
      deleteGroupDropdownOption(group.name);
      if (isDetailPage) mutate(`/groups/${group.id}`);
      mutate("/groups");
    });

    notify({
      title: "Delete Group " + group.name,
      description: "Group successfully deleted",
      promise,
      loadingMessage: "Deleting group...",
    });

    return promise;
  };

  const deleteGroup = async () => {
    const choice = await confirm({
      title: `Delete '${group.name}'?`,
      description:
        "Are you sure you want to delete this group? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleDelete().then();
  };

  const renameGroup = (name: string) => {
    if (!isAllowedToRename) return Promise.reject("Not allowed to rename");

    const currentPeerIds =
      group.peers?.map((p) => (typeof p === "string" ? p : p.id)) || [];
    const promise = groupRequest
      .put({ ...group, peers: currentPeerIds, name })
      .then(() => {
        updateGroupDropdown(group.name, { ...group, name });
        if (isDetailPage) mutate(`/groups/${group.id}`);
        mutate("/groups");
      });

    notify({
      title: `Rename Group ${group.name}`,
      description: "Group successfully renamed to " + name,
      promise,
      loadingMessage: "Renaming group...",
    });

    return promise;
  };

  const removePeersFromGroup = async (peers: Peer[]) => {
    if (!permission?.groups?.update) return Promise.reject();
    const peer = peers.length === 1 ? peers[0] : undefined;

    const choice = await confirm({
      title: peer
        ? `Remove peer '${peer.name}' from '${group.name}'?`
        : `Remove peers from '${group.name}'?`,
      description: peer
        ? `Are you sure you want to remove this peer from the group? You can add it back later if needed.`
        : `Are you sure you want to remove these peers from the group? You can add them back later if needed.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "warning",
      maxWidthClass: "max-w-lg",
    });

    if (!choice) return Promise.resolve();

    const currentPeerIds =
      group.peers?.map((p) => (typeof p === "string" ? p : p.id)) || [];
    const newPeerIds = currentPeerIds.filter((pid) => {
      return !peers.find((peer) => peer.id === pid);
    });
    const promise = groupRequest
      .put({ ...group, peers: newPeerIds })
      .then(() => {
        if (isDetailPage) mutate(`/groups/${group.id}`);
        mutate("/groups");
      });

    notify({
      title: `Remove Peer from Group`,
      description: peer
        ? `Peer '${peer.name}' successfully removed from group '${group.name}'`
        : `Peers successfully removed from group '${group.name}'`,
      promise,
      loadingMessage: peer
        ? "Removing peer from group..."
        : `Removing peers from group...`,
    });

    return promise;
  };

  const addPeersToGroup = async (peers: Peer[]) => {
    if (!permission?.groups?.update) return Promise.reject();

    const currentPeerIds =
      group.peers?.map((p) => (typeof p === "string" ? p : p.id)) || [];
    const newPeerIds = [...currentPeerIds, ...peers.map((peer) => peer.id)];

    const uniquePeerIds = Array.from(new Set(newPeerIds));

    const promise = groupRequest
      .put({ ...group, peers: uniquePeerIds })
      .then(() => {
        if (isDetailPage) mutate(`/groups/${group.id}`);
        mutate("/groups");
      });

    notify({
      title: "Adding peers to group",
      description: `Peers were successfully added to ${group.name}.`,
      promise,
      loadingMessage: "Adding peers to group...",
    });

    return promise;
  };

  const removeUserFromGroup = async (
    user: User,
    returnOnlyPromise?: boolean,
  ) => {
    if (!permission?.groups?.update) return Promise.reject();
    if (!permission?.users?.update) return Promise.reject();

    const currentGroupIds = user.auto_groups?.map((g) => g) || [];
    const newGroupIds = currentGroupIds.filter((gid) => gid !== group.id);
    const promise = userRequest
      .put({ ...user, auto_groups: newGroupIds }, `/${user.id}`)
      .then(() => {
        if (returnOnlyPromise) return;
        if (isDetailPage) mutate(`/groups/${group.id}`);
        mutate("/groups");
        mutate("/users?service_user=false");
      });

    if (!returnOnlyPromise) {
      notify({
        title: `Remove User from Group ${group.name}`,
        description: `User '${user.name}' was successfully removed from group '${group.name}'.`,
        promise,
        loadingMessage: "Removing user from group...",
      });
    }

    return promise;
  };

  const removeUsersFromGroup = async (users: User[]) => {
    let promises = users.map((user) => removeUserFromGroup(user, true));
    const promise = Promise.all(promises).then(() => {
      if (isDetailPage) mutate(`/groups/${group.id}`);
      mutate("/groups");
      mutate("/users?service_user=false");
    });
    notify({
      title: `Remove Users from Group ${group.name}`,
      description: `Users were successfully removed from group '${group.name}'.`,
      promise,
      loadingMessage: "Removing users from group...",
    });
    return promise;
  };

  const addUserToGroup = async (user: User, returnOnlyPromise?: boolean) => {
    if (!permission?.groups?.update) return Promise.reject();
    if (!permission?.users?.update) return Promise.reject();
    const currentGroupIds = user.auto_groups?.map((g) => g) || [];
    const newGroupIds = Array.from(new Set([...currentGroupIds, group.id]));
    const promise = userRequest
      .put({ ...user, auto_groups: newGroupIds }, `/${user.id}`)
      .then(() => {
        if (returnOnlyPromise) return;
        if (isDetailPage) mutate(`/groups/${group.id}`);
        mutate("/groups");
        mutate("/users?service_user=false");
      });
    if (!returnOnlyPromise) {
      notify({
        title: `Add User to Group ${group.name}`,
        description: `User '${user.name}' was successfully added to group '${group.name}'.`,
        promise,
        loadingMessage: "Adding user to group...",
      });
    }
    return promise;
  };

  const addUsersToGroup = async (users: User[]) => {
    let promises = users.map((user) => addUserToGroup(user, true));
    const promise = Promise.all(promises).then(() => {
      if (isDetailPage) mutate(`/groups/${group.id}`);
      mutate("/groups");
      mutate("/users?service_user=false");
    });
    notify({
      title: `Add Users to Group ${group.name}`,
      description: `Users were successfully added to group '${group.name}'.`,
      promise,
      loadingMessage: "Adding users to group...",
    });
    return promise;
  };

  const openGroupRenameModal = () => {
    if (!isAllowedToRename) return;
    setGroupNameModal(true);
  };

  return (
    <GroupContext.Provider
      value={{
        group,
        deleteGroup,
        renameGroup,
        isRegularGroup,
        isIntegrationGroup,
        isJWTGroup,
        isAllowedToDelete,
        isAllowedToRename,
        openGroupRenameModal,
        addPeersToGroup,
        removePeersFromGroup,
        addUsersToGroup,
        removeUsersFromGroup,
      }}
    >
      <EditGroupNameModal
        initialName={group.name}
        open={groupNameModal}
        onOpenChange={setGroupNameModal}
        onSuccess={(newName) =>
          renameGroup(newName).then(() => {
            setGroupNameModal(false);
          })
        }
      />
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const context = React.useContext(GroupContext);
  if (!context) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};
