import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { useApiCall } from "@utils/api";
import { DownloadIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Group, GroupPeer } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  device?: Peer;
  policy?: Policy;
  onNext?: () => void;
};

export const OnboardingAddUserDevice = ({ device, policy, onNext }: Props) => {
  const groupRequest = useApiCall<Group>("/groups", true);
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);

  const usersGroup = useMemo(() => {
    let rule = policy?.rules?.[0];
    const sourceGroups = rule?.sources as Group[];
    return sourceGroups?.find((g) => g.name === "Users");
  }, [policy]);

  const hasDeviceUsersGroup = device?.groups?.find((g) => g.name === "Users");

  /**
   * Detect the device and add it to the "Users" group
   */
  useEffect(() => {
    if (!hasDeviceUsersGroup && usersGroup && device) {
      let peersOfGroup = (usersGroup.peers as GroupPeer[]) || [];
      let newPeers = peersOfGroup
        .map((p) => p.id)
        .filter((x) => x !== undefined);
      if (device?.id) newPeers.push(device.id);
      groupRequest
        .put(
          {
            ...usersGroup,
            peers: newPeers,
          },
          `/${usersGroup.id}`,
        )
        .then(() => {
          mutate("/peers");
          mutate("/groups");
        });
    }
  }, [usersGroup, device, hasDeviceUsersGroup]);

  /**
   * Continue to next step once device is recognized
   */
  useEffect(() => {
    if (device && hasDeviceUsersGroup) {
      onNext?.();
    }
  }, [device, hasDeviceUsersGroup]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {"Time to add your client device"}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Your first resource and routing peer are all set. Now, take your device, install NetBird, and let's get you connected.`}
        </div>
      </div>

      <div className={"flex items-center justify-center mt-3"}>
        <Button variant={"primary"} onClick={() => setOpen(true)}>
          <DownloadIcon size={16} />
          Install NetBird
        </Button>
      </div>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <SetupModalContent title={"Install NetBird"} hideDocker={true} />
        </ModalContent>
      </Modal>
    </div>
  );
};
