import Button from "@components/Button";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { trim } from "lodash";
import * as React from "react";
import { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";

type Props = {
  initialName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (name: string) => void;
};
export const EditGroupNameModal = ({
  initialName,
  onOpenChange,
  open,
  onSuccess,
}: Props) => {
  const [name, setName] = useState(initialName);
  const { groups } = useGroups();
  const [error, setError] = useState("");

  const isDisabled = useMemo(() => {
    if (name === initialName) return true;
    if (error !== "") return true;
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name, initialName, error]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const findGroup = groups?.find((g) => g.name === newName);
    if (findGroup) {
      setError("This group already exists. Please choose another name.");
    } else {
      setError("");
    }
    setName(newName);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader
          title={"Rename Group"}
          description={"Set an easily identifiable name for your group."}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={"e.g., Developers"}
              value={name}
              onChange={handleNameChange}
              error={error}
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
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              Save
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
