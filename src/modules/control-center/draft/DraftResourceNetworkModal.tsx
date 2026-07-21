import Button from "@components/Button";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { ModalClose } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import Separator from "@components/Separator";
import { useReactFlow } from "@xyflow/react";
import { NetworkIcon, PlusCircle } from "lucide-react";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Network } from "@/interfaces/Network";
import { isFrameNode } from "@/modules/control-center/utils/helpers";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { NetworkModalContent } from "@/modules/networks/NetworkModal";

const CREATE_NEW = "__create_new__";

// "No Network" picker for a standalone draft resource: assign it to an
// existing network (a draft frame on canvas or a real API network) or create
// a new draft network (name + description via the networks-page modal) and
// drop the resource into it.
export const DraftResourceNetworkModal = () => {
  const { resourceNetworkPicker, setResourceNetworkPicker } = useDraftMode();
  return (
    <Modal
      open={!!resourceNetworkPicker}
      onOpenChange={(open) => !open && setResourceNetworkPicker(null)}
    >
      {resourceNetworkPicker && (
        <PickerContent
          resourceNodeId={resourceNetworkPicker.nodeId}
          onClose={() => setResourceNetworkPicker(null)}
        />
      )}
    </Modal>
  );
};

const PickerContent = ({
  resourceNodeId,
  onClose,
}: {
  resourceNodeId: string;
  onClose: () => void;
}) => {
  const reactFlow = useReactFlow();
  const { networks } = useControlCenterData();
  const { assignResourceToNetwork, assignResourceToExistingNetwork } =
    useDraftNetworkActions();
  const { addDraftNetwork } = useDraftNodeCreation();
  const [creating, setCreating] = React.useState(false);
  const [selected, setSelected] = React.useState("");

  // Network dropdown options — draft frames on canvas + every real network,
  // and a "Create New Network" item at the bottom (like the draft selector's
  // "Create New Draft"). Values are prefixed so the pick can tell them apart.
  const options: SelectOption[] = React.useMemo(() => {
    const frameNodes = reactFlow.getNodes().filter(isFrameNode);
    const frames = frameNodes.map((n) => ({
      value: `frame:${n.id}`,
      label:
        (n.data as { network?: { name?: string } })?.network?.name ??
        "Network",
      icon: ({ size }: { size?: number }) => <NetworkIcon size={size} />,
    }));
    // API networks not already present on the canvas as a frame (avoid dupes).
    const framedIds = new Set(frameNodes.map((n) => n.id));
    const api = (networks ?? [])
      .filter((n): n is Network & { id: string } => !!n.id)
      .filter((n) => !framedIds.has(`network-${n.id}`))
      .map((n) => ({
        value: `api:${n.id}`,
        label: n.name,
        icon: ({ size }: { size?: number }) => <NetworkIcon size={size} />,
      }));
    return [
      ...frames,
      ...api,
      {
        value: CREATE_NEW,
        label: "Create New Network",
        icon: ({ size }: { size?: number }) => <PlusCircle size={size} />,
      },
    ];
  }, [reactFlow, networks]);

  const onChange = (value: string) => {
    if (value === CREATE_NEW) {
      setCreating(true);
      return;
    }
    setSelected(value);
  };

  const save = () => {
    if (!selected) return;
    if (selected.startsWith("frame:")) {
      assignResourceToNetwork({
        resourceNodeId,
        networkNodeId: selected.slice("frame:".length),
      });
    } else if (selected.startsWith("api:")) {
      const id = selected.slice("api:".length);
      const net = networks?.find((n) => n.id === id);
      if (net?.id)
        assignResourceToExistingNetwork({
          resourceNodeId,
          network: { id: net.id, name: net.name },
        });
    }
    onClose();
  };

  // Create a new draft network (frame) with the entered name/description and
  // drop the resource into it.
  const createAndAssign = (values: { name: string; description: string }) => {
    const networkNodeId = addDraftNetwork(undefined, {
      name: values.name,
      description: values.description,
    });
    setTimeout(
      () => assignResourceToNetwork({ resourceNodeId, networkNodeId }),
      0,
    );
    onClose();
  };

  if (creating) {
    return (
      <NetworkModalContent
        network={undefined}
        useSave={false}
        onSaved={createAndAssign}
      />
    );
  }

  return (
    <ModalContent maxWidthClass={"max-w-lg"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={"Assign a network"}
        description={"Pick a network for this resource or create a new one."}
        color={"netbird"}
      />
      <Separator />
      <div className={"px-8 py-6"}>
        <SelectDropdown
          value={selected}
          onChange={onChange}
          options={options}
          placeholder={"Select a network..."}
          popoverWidth={"content"}
        />
      </div>
      <ModalFooter className={"sm:justify-end gap-3"}>
        <ModalClose asChild={true}>
          <Button variant={"secondary"}>Cancel</Button>
        </ModalClose>
        <Button variant={"primary"} disabled={!selected} onClick={save}>
          Save
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
