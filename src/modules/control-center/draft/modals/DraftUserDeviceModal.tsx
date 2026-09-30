import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import Separator from "@components/Separator";
import useFetchApi from "@utils/api";
import { sortBy } from "lodash";
import { DownloadIcon, MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { usePlaceholderUpgrade } from "@/modules/control-center/hooks/useDraftPeerUpgrade";
import { useStructuralNodes } from "@/modules/control-center/utils/helpers";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

export const DraftUserDeviceModal = () => {
  const { userDeviceModal, setUserDeviceModal } = useDraftMode();
  return (
    <Modal
      open={!!userDeviceModal}
      onOpenChange={(open) => !open && setUserDeviceModal(null)}
    >
      {userDeviceModal && (
        <StepperContent
          nodeId={userDeviceModal.nodeId}
          name={userDeviceModal.name}
          onClose={() => setUserDeviceModal(null)}
        />
      )}
    </Modal>
  );
};

const StepperContent = ({
  nodeId,
  name,
  onClose,
}: {
  nodeId: string;
  name: string;
  onClose: () => void;
}) => {
  const { setInstallModal } = useDraftMode();
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const nodes = useStructuralNodes();
  const upgrade = usePlaceholderUpgrade();
  const [selected, setSelected] = React.useState("");

  // Peers already on the canvas can't be picked twice.
  const options: SelectOption[] = React.useMemo(
    () =>
      sortBy(
        (peers ?? [])
          .filter((p) => !nodes.some((n) => n.id === `peer-${p.id}`))
          .map(
            (p) =>
              ({
                value: p.id,
                label: p.name,
                icon: () => <PeerOperatingSystemIcon os={p.os} />,
              }) as SelectOption,
          ),
        ["label", "value"],
      ),
    [peers, nodes],
  );

  const apply = () => {
    const peer = peers?.find((p) => p.id === selected);
    if (!peer?.id) return;
    upgrade([{ nodeId, peer }]);
    onClose();
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<MonitorSmartphoneIcon size={18} className={"text-netbird"} />}
        title={`Set up “${name}”`}
        description={"Install NetBird and assign the registered peer."}
        color={"netbird"}
      />
      <Separator />
      <div className={"px-8 py-3 flex flex-col gap-0 z-0"}>
        <Steps>
          <Steps.Step step={1}>
            <p className={"text-sm font-normal"}>
              Install NetBird on the device. Skip if it is already installed.
            </p>
            <div className={"flex gap-4"}>
              <Button
                variant={"primary"}
                size={"xs"}
                onClick={() =>
                  setInstallModal({
                    isUserDevice: true,
                    placeholderKind: "user-device",
                    nodeId,
                  })
                }
              >
                <DownloadIcon size={14} />
                Install NetBird
              </Button>
            </div>
          </Steps.Step>
          <Steps.Step step={2} line={false}>
            <p className={"text-sm font-normal"}>
              Assign the peer this device registered as
            </p>
            <SelectDropdown
              variant={"secondary"}
              value={selected}
              onChange={setSelected}
              options={options}
              showSearch={true}
              searchPlaceholder={"Search peers..."}
              placeholder={"Select a peer..."}
              maxHeight={280}
            />
          </Steps.Step>
        </Steps>
      </div>
      {/* The footer's built-in border is a slightly different gray. */}
      <Separator />
      <ModalFooter className={"items-center"} separator={false}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            disabled={!selected}
            onClick={apply}
            data-testid={"cc-user-device-select"}
          >
            Assign
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
