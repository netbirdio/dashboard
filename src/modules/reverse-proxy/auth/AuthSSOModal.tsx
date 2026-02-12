import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import React, { useState } from "react";
import { Group } from "@/interfaces/Group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroups: Group[];
  onSave: (groups: Group[]) => void;
  onRemove: () => void;
};

export default function AuthSSOModal({
  open,
  onOpenChange,
  currentGroups,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const [groups, setGroups] = useState<Group[]>(currentGroups);
  const isEditing = currentGroups.length > 0;

  const handleSave = () => {
    if (groups.length > 0) {
      onOpenChange(false);
      onSave(groups);
    }
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
            placeholder="Select distribution groups..."
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
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={groups.length === 0}
                  >
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
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={groups.length === 0}
                  >
                    Add Groups
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
