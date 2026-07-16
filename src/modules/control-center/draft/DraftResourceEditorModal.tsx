import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { useReactFlow } from "@xyflow/react";
import { trim } from "lodash";
import { ArrowLeftIcon, GlobeIcon, NetworkIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { Group } from "@/interfaces/Group";
import { Network } from "@/interfaces/Network";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
  DraftNetworkRef,
  getDraftResource,
} from "@/modules/control-center/utils/helpers";
import { ResourceSingleAddressInput } from "@/modules/networks/resources/ResourceSingleAddressInput";

const CREATE_NETWORK = "__create-network__";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Draft resource editor — pure-data modal (no API call): the resource lands
// in the changeset once name + address + network are set, and deploys via
// POST /networks/{id}/resources. Opened on drop and re-opened from the
// node's "Set up" affordance / click.
export const DraftResourceEditorModal = () => {
  const { resourceEditor, setResourceEditor } = useDraftMode();
  return (
    <Modal
      open={!!resourceEditor}
      onOpenChange={(open) => !open && setResourceEditor(null)}
    >
      {resourceEditor && (
        <EditorContent
          nodeId={resourceEditor.nodeId}
          onClose={() => setResourceEditor(null)}
        />
      )}
    </Modal>
  );
};

const EditorContent = ({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) => {
  const reactFlow = useReactFlow();
  const { networks, networkResources, groups: apiGroups } =
    useControlCenterData();
  const { changes, trackCreateGroup, trackCreateNetwork } =
    useDraftChangeset();
  const { saveDraftResource } = useDraftNetworkActions();

  const node = reactFlow.getNodes().find((n) => n.id === nodeId);
  const resource = getDraftResource(node);
  const currentNetwork = (node?.data as { draftNetwork?: DraftNetworkRef })
    ?.draftNetwork;
  const currentGroupIds =
    (node?.data as { resourceGroupIds?: string[] })?.resourceGroupIds ?? [];

  const [name, setName] = useState(resource?.name ?? "");
  const [address, setAddress] = useState(resource?.address ?? "");
  const [addressError, setAddressError] = useState("");
  const [description, setDescription] = useState(
    resource?.description ?? "",
  );

  // Draft networks on the canvas join the API networks in the selector;
  // "Create new network" swaps the select for a name input.
  const draftNetworkOptions = useMemo(() => {
    const options: SelectOption[] = [];
    reactFlow.getNodes().forEach((n) => {
      if (!n.id.startsWith("network-new-")) return;
      const network = (n.data as { network?: Network })?.network;
      if (!network?.name) return;
      options.push({
        value: n.id.replace("network-", ""),
        label: network.name,
        icon: () => <NetworkIcon size={14} />,
        group: "Draft networks",
      });
    });
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactFlow, nodeId]);

  const networkOptions: SelectOption[] = useMemo(
    () => [
      {
        value: CREATE_NETWORK,
        label: "Create new network...",
        icon: () => <PlusIcon size={14} />,
      },
      ...draftNetworkOptions,
      ...(networks ?? []).map((n) => ({
        value: n.id,
        label: n.name,
        icon: () => <NetworkIcon size={14} />,
        group: "Existing networks",
      })),
    ],
    [networks, draftNetworkOptions],
  );

  const [networkValue, setNetworkValue] = useState<string>(
    currentNetwork?.networkClientId ?? currentNetwork?.networkId ?? "",
  );
  const [creatingNetwork, setCreatingNetwork] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState("");

  const [selectedGroups, setSelectedGroups] = useState<Group[]>(
    currentGroupIds.map(
      (idOrName) =>
        apiGroups?.find((g) => g.id === idOrName) ??
        ({ name: idOrName } as Group),
    ),
  );

  // Name must be unique across API resources and the other draft resources.
  const nameError = useMemo(() => {
    const trimmed = trim(name);
    if (!trimmed) return "";
    const takenByApi = networkResources?.some(
      (r) => r.name === trimmed && r.id !== resource?.id,
    );
    const takenOnCanvas = reactFlow.getNodes().some((n) => {
      if (n.id === nodeId || !n.id.startsWith("resource-new-")) return false;
      return (
        (n.data as { resource?: { name?: string } })?.resource?.name ===
        trimmed
      );
    });
    return takenByApi || takenOnCanvas
      ? "A resource with this name already exists."
      : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, networkResources, nodeId]);

  const networkNameTaken = useMemo(() => {
    const trimmed = trim(newNetworkName);
    if (!trimmed) return false;
    return (
      (networks ?? []).some((n) => n.name === trimmed) ||
      draftNetworkOptions.some((o) => o.label === trimmed)
    );
  }, [newNetworkName, networks, draftNetworkOptions]);

  const canSave =
    trim(name).length > 0 &&
    !nameError &&
    trim(address).length > 0 &&
    !addressError &&
    (creatingNetwork
      ? trim(newNetworkName).length > 0 && !networkNameTaken
      : networkValue.length > 0);

  const submit = () => {
    if (!canSave || !node) return;

    // Resolve (or create) the parent network.
    let networkRef: DraftNetworkRef;
    if (creatingNetwork) {
      const networkName = trim(newNetworkName);
      const networkNodeId = `network-new-${uid()}`;
      reactFlow.setNodes((prev) =>
        prev.concat({
          id: networkNodeId,
          type: "networkNode",
          position: {
            x: node.position.x + 380,
            y: node.position.y - 40,
          },
          data: { network: { name: networkName, resources: [] } },
        }),
      );
      trackCreateNetwork({
        clientId: networkNodeId.replace("network-", ""),
        name: networkName,
      });
      networkRef = {
        networkClientId: networkNodeId.replace("network-", ""),
        name: networkName,
      };
    } else {
      const apiNetwork = networks?.find((n) => n.id === networkValue);
      if (apiNetwork) {
        networkRef = { networkId: apiNetwork.id, name: apiNetwork.name };
      } else {
        // Draft network labels are always plain strings (set above).
        const label = draftNetworkOptions.find(
          (o) => o.value === networkValue,
        )?.label as string | undefined;
        if (!label) return;
        networkRef = { networkClientId: networkValue, name: label };
      }
    }

    // Group refs: API ids, or names for draft groups — groups typed straight
    // into the selector need their create-group change (same as policies).
    const groupIds = selectedGroups.map((g) => g.id ?? g.name);
    selectedGroups.forEach((g) => {
      if (g.id) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === g.name,
      );
      if (!exists) {
        trackCreateGroup({ clientId: `group-new-${g.name}`, name: g.name });
      }
    });

    saveDraftResource({
      nodeId,
      name: trim(name),
      address: trim(address),
      description: trim(description) || undefined,
      groupIds,
      network: networkRef,
    });
    onClose();
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<GlobeIcon size={18} />}
        title={"Set Up Resource"}
        description={
          "A resource is a host, subnet, or domain in a network, made reachable through the network's routing peers."
        }
        color={"netbird"}
      />
      <div className={"px-8 py-6 flex flex-col gap-6"}>
        <div>
          <Label>Name</Label>
          <HelpText>Set an easily identifiable name for the resource</HelpText>
          <Input
            placeholder={"e.g., Postgres DB"}
            value={name}
            error={nameError}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <ResourceSingleAddressInput
          value={address}
          onChange={setAddress}
          onError={setAddressError}
        />

        <div>
          <Label>Network</Label>
          <HelpText>
            The network this resource belongs to — resources are reachable
            through the network&apos;s routing peers
          </HelpText>
          {creatingNetwork ? (
            <div className={"flex gap-2 items-start"}>
              <div className={"w-full"}>
                <Input
                  placeholder={"e.g., Office Network"}
                  value={newNetworkName}
                  error={
                    networkNameTaken
                      ? "A network with this name already exists."
                      : ""
                  }
                  onChange={(e) => setNewNetworkName(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                variant={"secondary"}
                className={"shrink-0"}
                onClick={() => setCreatingNetwork(false)}
              >
                <ArrowLeftIcon size={14} />
              </Button>
            </div>
          ) : (
            <SelectDropdown
              value={networkValue}
              onChange={(value: string) => {
                if (value === CREATE_NETWORK) {
                  setCreatingNetwork(true);
                  return;
                }
                setNetworkValue(value);
              }}
              options={networkOptions}
              placeholder={"Select a network..."}
              searchPlaceholder={"Search networks..."}
              showSearch={true}
            />
          )}
        </div>

        <div>
          <Label>Assigned Groups (optional)</Label>
          <HelpText>
            Add this resource to groups so one policy can cover many resources
          </HelpText>
          <PeerGroupSelector
            values={selectedGroups}
            onChange={setSelectedGroups}
            hideAllGroup={true}
            saveGroupAssignments={false}
          />
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Input
            placeholder={"e.g., Production database"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <ModalFooter className={"items-center"} separator={false}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"} className={"w-full"}>
              Cancel
            </Button>
          </ModalClose>
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!canSave}
            onClick={submit}
          >
            Save Resource
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
