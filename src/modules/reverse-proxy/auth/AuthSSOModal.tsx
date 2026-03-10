import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import React, { useState } from "react";
import { Group } from "@/interfaces/Group";
import { useUsers } from "@/contexts/UsersProvider";
import Badge from "@components/Badge";
import { CircleUser } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroups: Group[];
  isEnabled: boolean;
  onSave: (groups: Group[]) => void;
  onRemove: () => void;
};

export default function AuthSSOModal({
  open,
  onOpenChange,
  currentGroups,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const { users } = useUsers();
  const [groups, setGroups] = useState<Group[]>(currentGroups);
  const isEditing = isEnabled;

  const handleSave = () => {
    onOpenChange(false);
    onSave(groups);
  };

  const handleRemove = () => {
    onOpenChange(false);
    setGroups([]);
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-xl">
        <ModalHeader
          title="SSO (Single Sign-On)"
          description="Require users to authenticate via SSO to access this service."
        />

        <GradientFadedBackground />

        <div className="px-8">
          <PeerGroupSelector
            values={groups}
            onChange={setGroups}
            placeholder={
              <div className={"flex items-center gap-2"}>
                <Badge className={"py-[3px]"} variant={"gray-ghost"}>
                  <CircleUser size={12} />
                  All Users
                </Badge>
                Select user groups...
              </div>
            }
            users={users}
            hideAllGroup={true}
          />
          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  Remove
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button variant="primary" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button variant="primary" onClick={handleSave}>
                    Add SSO
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
