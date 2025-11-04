import { notify } from "@components/Notification";
import SkeletonPeerDetail from "@components/skeletons/SkeletonPeerDetail";
import { useApiCall } from "@utils/api";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Group, GroupPeer } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";
import { PeerSSHInstructions } from "@/modules/peer/PeerSSHInstructions";

type Props = {
  children: React.ReactNode;
  peer: Peer;
  isPeerDetailPage?: boolean;
};

const PeerContext = React.createContext(
  {} as {
    peer: Peer;
    user?: User;
    peerGroups: Group[];
    update: (props: {
      name?: string;
      ssh?: boolean;
      loginExpiration?: boolean;
      inactivityExpiration?: boolean;
      approval_required?: boolean;
      ip?: string;
    }) => Promise<Peer>;
    toggleSSH: (newState: boolean) => Promise<void>;
    setSSHInstructionsModal: (open: boolean) => void;
    deletePeer: () => void;
    isLoading: boolean;
  },
);

export default function PeerProvider({
  children,
  peer,
  isPeerDetailPage = false,
}: Props) {
  const user = usePeerUser(peer);
  const { peerGroups, isLoading } = usePeerGroups(peer);
  const peerRequest = useApiCall<Peer>("/peers", true);
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const [sshInstructionsModal, setSSHInstructionsModal] = useState(false);

  const deletePeer = async () => {
    const choice = await confirm({
      title: `Delete '${peer.name}'?`,
      description:
        "Are you sure you want to delete this peer? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (choice) {
      notify({
        title: peer.name,
        description: "Peer was successfully deleted",
        promise: peerRequest.del({}, `/${peer.id}`).then(() => {
          mutate("/peers");
          mutate("/groups");
        }),
        loadingMessage: "Deleting peer...",
      });
    }
  };

  const update = async (props: {
    name?: string;
    ssh?: boolean;
    loginExpiration?: boolean;
    inactivityExpiration?: boolean;
    approval_required?: boolean;
    ip?: string;
  }) => {
    return peerRequest.put(
      {
        peerId: peer?.id,
        name: props.name != undefined ? props.name : peer.name,
        ssh_enabled: props.ssh != undefined ? props.ssh : peer.ssh_enabled,
        login_expiration_enabled:
          props.loginExpiration != undefined
            ? props.loginExpiration
            : peer.login_expiration_enabled,
        inactivity_expiration_enabled:
          props?.inactivityExpiration == undefined
            ? undefined
            : props.inactivityExpiration,
        approval_required:
          props?.approval_required == undefined
            ? undefined
            : props.approval_required,
        ip: props.ip != undefined ? props.ip : undefined,
      },
      `/${peer.id}`,
    );
  };

  const toggleSSH = async (enable: boolean) => {
    if (!permission.peers.update) return;
    notify({
      title: peer.name,
      description: enable
        ? "SSH Access successfully enabled"
        : "SSH Access successfully disabled",
      promise: update({ ssh: enable }).then(() => {
        isPeerDetailPage ? mutate(`/peers/${peer.id}`) : mutate("/peers");
        setSSHInstructionsModal(false);
      }),
      loadingMessage: enable
        ? "Enabling SSH Access..."
        : "Disabling SSH Access...",
    });
  };

  return !isLoading ? (
    <PeerContext.Provider
      value={{
        peer,
        peerGroups,
        user,
        update,
        toggleSSH,
        setSSHInstructionsModal,
        deletePeer,
        isLoading,
      }}
    >
      {sshInstructionsModal && (
        <PeerSSHInstructions
          open={sshInstructionsModal}
          onOpenChange={setSSHInstructionsModal}
          onSuccess={() => toggleSSH(true)}
        />
      )}

      {children}
    </PeerContext.Provider>
  ) : isPeerDetailPage ? (
    <SkeletonPeerDetail />
  ) : null;
}

/**
 * Get the groups of a peer
 * @param peer
 */
export const usePeerGroups = (peer?: Peer) => {
  const { groups, isLoading } = useGroups();

  const peerGroups = useMemo(() => {
    if (!peer) return [];
    const peerGroups = groups?.filter((group) => {
      const foundGroup = group.peers?.find((p) => {
        const peerGroup = p as GroupPeer;
        return peerGroup.id === peer.id;
      });
      return foundGroup !== undefined;
    });
    return peerGroups || [];
  }, [groups, peer]);

  return { peerGroups, isLoading };
};

/**
 * Get the user of a peer
 * @param peer
 */
export const usePeerUser = (peer: Peer) => {
  const { users } = useUsers();

  return useMemo(() => {
    return users?.find((user) => user.id === peer.user_id);
  }, [users, peer]);
};

/**
 * Access the peer context
 */
export const usePeer = () => React.useContext(PeerContext);
