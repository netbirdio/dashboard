import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import MultipleGroups from "@components/ui/MultipleGroups";
import { IconCirclePlus } from "@tabler/icons-react";
import { FolderGit2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  groups: string[];
  onSave?: (promises: Promise<Group>[]) => Promise<void>;
  modal?: boolean;
  setModal?: React.Dispatch<React.SetStateAction<boolean>>;
  label?: string;
  description?: string;
  peer?: Peer;
  showAddGroupButton?: boolean;
  hideAllGroup?: boolean;
  disabled: boolean;
};

export default function GroupsRow({
  groups,
  onSave,
  modal,
  setModal,
  label = "Assigned Groups",
  description = "Use groups to control what this peer can access",
  peer,
  showAddGroupButton = false,
  hideAllGroup = false,
  disabled = false,
}: Readonly<Props>) {
  const { groups: allGroups } = useGroups();
  const { permission } = usePermissions();

  // Get the group by the id
  const foundGroups = useMemo(() => {
    return groups
      .map((group) => {
        return allGroups?.find((g) => g.id == group);
      })
      .filter((g) => g !== undefined) as Group[];
  }, [groups, allGroups]);

  return (
    <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
      <ModalTrigger
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setModal && permission.groups.update && setModal(true);
        }}
      >
        {foundGroups?.length == 0 && showAddGroupButton ? (
          <Badge variant={"gray"} useHover={true}>
            <IconCirclePlus size={14} />
            Add Groups
          </Badge>
        ) : (
          <MultipleGroups groups={foundGroups} label={label} />
        )}
      </ModalTrigger>
      <EditGroupsModal
        groups={foundGroups}
        onSave={onSave}
        label={label}
        description={description}
        peer={peer}
        hideAllGroup={hideAllGroup}
        disabled={disabled}
      />
    </Modal>
  );
}

type EditGroupsModalProps = {
  groups: Group[];
  onSave?: (promises: Promise<Group>[]) => Promise<void>;
  label?: string;
  description?: string;
  peer?: Peer;
  hideAllGroup?: boolean;
  disabled: boolean;
};

export function EditGroupsModal({
  groups,
  onSave,
  label,
  description,
  peer,
  hideAllGroup = false,
  disabled,
}: Readonly<EditGroupsModalProps>) {
  const [selectedGroups, setSelectedGroups, { getAllGroupCalls }] =
    useGroupHelper({
      initial: groups,
      peer,
    });

  const handleSave = async () => {
    onSave && (await onSave(getAllGroupCalls()));
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<FolderGit2 size={18} />}
        title={label || "Assigned Groups"}
        description={description}
        color={"blue"}
      />

      <Separator />

      <div className={"px-8 py-6 flex flex-col gap-8"}>
        <div>
          <PeerGroupSelector
            onChange={setSelectedGroups}
            values={selectedGroups}
            peer={peer}
            hideAllGroup={hideAllGroup}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button variant={"primary"} onClick={handleSave} disabled={disabled}>
            Save Groups
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
