import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import { useApiCall } from "@utils/api";
import { FolderGit2 } from "lucide-react";
import * as React from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type ResourceGroupModalProps = {
  resource?: NetworkResource;
  network?: Network;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (r: NetworkResource) => void;
};
export const ResourceGroupModal = ({
  resource,
  network,
  open,
  onOpenChange,
  onUpdated,
}: ResourceGroupModalProps) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {network && resource && (
        <ResourceGroupModalContent
          network={network}
          resource={resource}
          onUpdated={onUpdated}
          key={open ? "1" : "0"}
        />
      )}
    </Modal>
  );
};

type ModalProps = {
  onUpdated?: (r: NetworkResource) => void;
  network?: Network;
  resource?: NetworkResource;
};

const ResourceGroupModalContent = ({
  resource,
  network,
  onUpdated,
}: ModalProps) => {
  const update = useApiCall<NetworkResource>(
    `/networks/${network?.id}/resources/${resource?.id}`,
  ).put;

  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: resource?.groups || [],
  });

  const updateResource = async () => {
    const savedGroups = await saveGroups();
    notify({
      title: "Update Resource",
      description: `'${resource?.name}' groups updated`,
      loadingMessage: "Updating resource groups...",
      promise: update({
        ...resource,
        groups: savedGroups.map((g) => g.id),
      }).then((r) => {
        onUpdated?.(r);
      }),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<FolderGit2 size={18} />}
        title={"Resource Groups"}
        description={
          "Assign this resource to a group (e.g., Databases, Web Servers) and use it as the destination in access control policies."
        }
        color={"blue"}
      />

      <Separator />

      <div className={"px-8 py-6 flex flex-col gap-8"}>
        <div>
          <PeerGroupSelector
            onChange={setGroups}
            values={groups}
            showPeerCounter={false}
            placeholder={"Add or select resource group(s)..."}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button variant={"primary"} onClick={updateResource}>
            Save Groups
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
