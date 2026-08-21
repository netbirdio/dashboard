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
import {
  getNetworkRef,
  useDraftNetworkActions,
} from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { NetworkModalContent } from "@/modules/networks/NetworkModal";
import { SmallBadge } from "@components/ui/SmallBadge";

// "No Network" picker for a standalone draft resource: assign it to an existing
// network (a canvas frame or a real API network) or to a new draft network.
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
  const {
    assignResourceToNetwork,
    assignResourceToExistingNetwork,
    assignHeldResourceToNetwork,
  } = useDraftNetworkActions();
  const { addDraftNetwork } = useDraftNodeCreation();
  const [creating, setCreating] = React.useState(false);
  const [selected, setSelected] = React.useState("");

  // Values are prefixed so the pick can tell a canvas frame from a real
  // network.
  const options: SelectOption[] = React.useMemo(() => {
    const frameNodes = reactFlow.getNodes().filter(isFrameNode);
    const frames = frameNodes.map((n) => {
      const name =
        (n.data as { network?: { name?: string } })?.network?.name ??
        "Network";
      const isNew = n.id.startsWith("network-new-");
      return {
        value: `frame:${n.id}`,
        searchValue: name,
        label: isNew ? (
          <span className={"flex items-center gap-2"}>
            {name}
            <SmallBadge />
          </span>
        ) : (
          name
        ),
        icon: ({ size }: { size?: number }) => <NetworkIcon size={size} />,
      };
    });
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
    return [...frames, ...api];
  }, [reactFlow, networks]);

  // The resource may have no canvas node anymore (absorbed into a group), and
  // those assign through the group-held path.
  const isHeld = !reactFlow.getNodes().some((n) => n.id === resourceNodeId);
  const heldResourceId = resourceNodeId.replace("resource-", "");

  const save = () => {
    if (!selected) return;
    if (selected.startsWith("frame:")) {
      const networkNodeId = selected.slice("frame:".length);
      if (isHeld) {
        const frame = reactFlow.getNodes().find((n) => n.id === networkNodeId);
        const networkRef = getNetworkRef(frame);
        if (networkRef) {
          assignHeldResourceToNetwork({
            resourceId: heldResourceId,
            networkRef,
          });
        }
      } else {
        assignResourceToNetwork({ resourceNodeId, networkNodeId });
      }
    } else if (selected.startsWith("api:")) {
      const id = selected.slice("api:".length);
      const net = networks?.find((n) => n.id === id);
      if (net?.id) {
        if (isHeld) {
          assignHeldResourceToNetwork({
            resourceId: heldResourceId,
            networkRef: { networkId: net.id, name: net.name },
          });
        } else {
          assignResourceToExistingNetwork({
            resourceNodeId,
            network: { id: net.id, name: net.name },
          });
        }
      }
    }
    onClose();
  };

  const createAndAssign = (values: { name: string; description: string }) => {
    const networkNodeId = addDraftNetwork(undefined, {
      name: values.name,
      description: values.description,
    });
    // The frame reaches the ReactFlow store only after the next React commit;
    // assigning before that silently leaves the resource unparented.
    const tryAssign = (attempt = 0) => {
      const frame = reactFlow.getNodes().find((n) => n.id === networkNodeId);
      if (frame) {
        if (isHeld) {
          const networkRef = getNetworkRef(frame);
          if (networkRef) {
            assignHeldResourceToNetwork({
              resourceId: heldResourceId,
              networkRef,
            });
          }
        } else {
          assignResourceToNetwork({ resourceNodeId, networkNodeId });
        }
        return;
      }
      if (attempt < 60) requestAnimationFrame(() => tryAssign(attempt + 1));
    };
    tryAssign();
    setCreating(false);
    onClose();
  };

  return (
    <>
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
            onChange={setSelected}
            options={options}
            showSearch={true}
            searchPlaceholder={"Search networks..."}
            placeholder={"Select or create a network..."}
            maxHeight={190}
            // Pinned below the options so scroll or search can't hide it.
            footer={(close) => (
              <div className={"p-2"}>
                <button
                  type={"button"}
                  className={
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-nb-gray-200 hover:bg-nb-gray-800/60 w-full transition-colors"
                  }
                  onClick={() => {
                    close();
                    setCreating(true);
                  }}
                >
                  <PlusCircle size={14} />
                  Create New Network
                </button>
              </div>
            )}
          />
        </div>
        {/* Same separator color as the header. */}
        <Separator />
        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
            <Button variant={"primary"} disabled={!selected} onClick={save}>
              Assign Network
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
      {/* Opens ON TOP of the picker so Cancel returns to it. */}
      <Modal
        open={creating}
        onOpenChange={(open) => !open && setCreating(false)}
      >
        {creating && (
          <NetworkModalContent
            network={undefined}
            useSave={false}
            onSaved={createAndAssign}
          />
        )}
      </Modal>
    </>
  );
};
