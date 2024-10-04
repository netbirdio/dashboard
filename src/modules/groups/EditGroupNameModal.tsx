import Button from "@components/Button";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { IconCornerDownLeft } from "@tabler/icons-react";
import { trim } from "lodash";
import * as React from "react";
import { useMemo, useState } from "react";

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
  const isDisabled = useMemo(() => {
    if (name === initialName) return true;
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name, initialName]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <form>
          <ModalHeader
            title={"Edit Group Name"}
            description={"Set an easily identifiable name for your group."}
            color={"blue"}
          />

          <div className={"p-default flex flex-col gap-4"}>
            <div>
              <Input
                placeholder={"e.g., AWS Servers"}
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                Confirm
                <IconCornerDownLeft size={16} />
              </Button>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
