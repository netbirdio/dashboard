import React, { useEffect, useMemo, useState } from "react";
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
import { Group } from "@/interfaces/Group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (name: string) => void;
  groups: Group[] | undefined;
};

export const CreateGroupNameModal = ({
  open,
  onOpenChange,
  onSuccess,
  groups,
}: Props) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const isDisabled = useMemo(() => {
    if (error !== "") return true;
    return trim(name).length === 0;
  }, [name, error]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const exists = groups?.find((g) => g.name === newName);
    setError(
      exists
        ? "This group already exists. Please choose another name."
        : "",
    );
    setName(newName);
  };

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader
          title={"Create Group"}
          description={"Set an easily identifiable name for your group."}
          color={"blue"}
        />
        <div className={"p-default flex flex-col gap-4"}>
          <Input
            placeholder={"e.g., Developers"}
            value={name}
            onChange={handleNameChange}
            error={error}
            autoFocus
          />
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
              onClick={() => onSuccess(trim(name))}
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
