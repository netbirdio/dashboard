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
  onRename: (name: string) => void;
  currentName: string;
  groups: Group[] | undefined;
};

export const GroupRenameModal = ({
  open,
  onOpenChange,
  onRename,
  currentName,
  groups,
}: Props) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState("");

  const isDisabled = useMemo(() => {
    if (error !== "") return true;
    const trimmed = trim(name);
    return trimmed.length === 0 || trimmed === currentName;
  }, [name, error, currentName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const exists =
      newName !== currentName && groups?.find((g) => g.name === newName);
    setError(
      exists ? "This group already exists. Please choose another name." : "",
    );
    setName(newName);
  };

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError("");
    }
  }, [open, currentName]);

  const submit = () => {
    if (isDisabled) return;
    onOpenChange(false);
    onRename(trim(name));
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
          <Input
            placeholder={"e.g., Developers"}
            value={name}
            onChange={handleNameChange}
            onKeyDown={(e) => e.key === "Enter" && submit()}
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
              disabled={isDisabled}
              onClick={submit}
            >
              Rename
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
