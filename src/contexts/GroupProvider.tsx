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
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
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
    if (!isAllowedToDelete) return Promise.reject(t("group.notAllowedToDelete"));

    const promise = groupRequest.del().then(() => {
      deleteGroupDropdownOption(group.name);
      if (isDetailPage) mutate(`/groups/${group.id}`);
      mutate("/groups");
    });

    notify({
      title: t("group.deleteGroup") + " " + group.name,
      description: t("group.groupDeleted"),
      promise,
      loadingMessage: t("group.deletingGroup"),
    });

    return promise;
  };

  const deleteGroup = async () => {
    const choice = await confirm({
      title: t("group.deleteGroupConfirm", { name: group.name }),
      description: t("group.deleteGroupDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleDelete().then();
  };

  const renameGroup = (name: string) => {
    if (!isAllowedToRename) return Promise.reject(t("group.notAllowedToRename"));

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
      title: t("group.renameGroup") + " " + group.name,
      description: t("group.groupRenamed", { name }),
      promise,
      loadingMessage: t("group.renamingGroup"),
    });

    return promise;
  };

  const removePeersFromGroup = async (peers: Peer[]) => {
    if (!permission?.groups?.update) return Promise.reject();
    const peer = peers.length === 1 ? peers[0] : undefined;

    const choice = await confirm({
      title: peer
        ? t("group.removePeerConfirm", { peerName: peer.name, groupName: group.name })
        : t("group.removePeersConfirm", { groupName: group.name }),
      description: peer
        ? t("group.removePeerDescription")
        : t("group.removePeersDescription"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
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
      title: t("group.removePeerFromGroup"),
      description: peer
        ? t("group.peerRemoved", { peerName: peer.name, groupName: group.name })
        : t("group.peersRemoved", { groupName: group.name }),
      promise,
      loadingMessage: peer
        ? t("group.removingPeerFromGroup")
        : t("group.removingPeersFromGroup"),
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
      title: t("group.addingPeersToGroup"),
      description: t("group.peersAdded", { groupName: group.name }),
      promise,
      loadingMessage: t("group.addingPeersToGroup"),
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
        title: t("group.removeUserFromGroup") + " " + group.name,
        description: t("group.userRemoved", { userName: user.name, groupName: group.name }),
        promise,
        loadingMessage: t("group.removingUserFromGroup"),
      });
    }

    return promise;
  };

  const removeUsersFromGroup = async (users: User[]) => {
    if (!permission?.groups?.update) return Promise.reject();
    if (!permission?.users?.update) return Promise.reject();
    let promises = users.map((user) => removeUserFromGroup(user, true));

    const user = users.length === 1 ? users[0] : undefined;

    const choice = await confirm({
      title: user
        ? t("group.removeUserConfirm", { userName: user?.name ?? user?.id, groupName: group.name })
        : t("group.removeUsersConfirm", { groupName: group.name }),
      description: user
        ? t("group.removeUserDescription")
        : t("group.removeUsersDescription"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
      type: "warning",
      maxWidthClass: "max-w-lg",
    });
    if (!choice) return Promise.resolve();

    const promise = Promise.all(promises).then(() => {
      if (isDetailPage) mutate(`/groups/${group.id}`);
      mutate("/groups");
      mutate("/users?service_user=false");
    });
    notify({
      title: t("group.removeUsersFromGroup") + " " + group.name,
      description: t("group.usersRemoved", { groupName: group.name }),
      promise,
      loadingMessage: t("group.removingUsersFromGroup"),
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
        title: t("group.addUserToGroup") + " " + group.name,
        description: t("group.userAdded", { userName: user.name, groupName: group.name }),
        promise,
        loadingMessage: t("group.addingUserToGroup"),
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
      title: t("group.addUsersToGroup") + " " + group.name,
      description: t("group.usersAdded", { groupName: group.name }),
      promise,
      loadingMessage: t("group.addingUsersToGroup"),
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
