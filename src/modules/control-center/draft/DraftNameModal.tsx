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
  onSuccess: (name: string) => void;
  initialName?: string;
  title?: string;
  description?: string;
};

export const DraftNameModal = ({
  open,
  onOpenChange,
  onSuccess,
  initialName = "",
  title = "Name Draft",
  description = "Set an easily identifiable name for your draft.",
}: Props) => {
  const [name, setName] = useState(initialName);

  const isDisabled = useMemo(() => trim(name).length === 0, [name]);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader title={title} description={description} color={"blue"} />
        <div className={"p-default flex flex-col gap-4"}>
          <Input
            placeholder={"e.g., Staging rollout"}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              onClick={() => {
                onOpenChange(false);
                onSuccess(trim(name));
              }}
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
