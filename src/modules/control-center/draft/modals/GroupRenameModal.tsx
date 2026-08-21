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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (name: string) => void;
  currentName: string;
  // Names that are already in use (group names, placeholder peer names on the
  // canvas, …) — a match blocks the rename.
  takenNames: string[];
  duplicateError?: string;
  title?: string;
  description?: string;
  inputPlaceholder?: string;
};

export const GroupRenameModal = ({
  open,
  onOpenChange,
  onRename,
  currentName,
  takenNames,
  duplicateError = "This group already exists. Please choose another name.",
  title = "Rename Group",
  description = "Set an easily identifiable name for your group.",
  inputPlaceholder = "e.g., Developers",
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
      newName !== currentName && takenNames.includes(trim(newName));
    setError(exists ? duplicateError : "");
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
        <ModalHeader title={title} description={description} color={"blue"} />
        <div className={"p-default flex flex-col"}>
          <Input
            placeholder={inputPlaceholder}
            value={name}
            onChange={handleNameChange}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            error={error}
            autoFocus
            data-testid="cc-rename-input"
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
              data-testid="cc-rename-submit"
            >
              Rename
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
