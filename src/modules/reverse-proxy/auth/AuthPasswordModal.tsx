import Button from "@components/Button";
import { Input } from "@components/Input";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import React, { useState } from "react";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPassword: string;
  isEnabled: boolean;
  onSave: (password: string) => void;
  onRemove: () => void;
};

export default function AuthPasswordModal({
  open,
  onOpenChange,
  currentPassword,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const [password, setPassword] = useState(currentPassword);
  const [isMasked, setIsMasked] = useState(isEnabled && currentPassword === "");
  const isEditing = isEnabled;

  const handleSave = () => {
    if (password.trim()) {
      onOpenChange(false);
      onSave(password);
    }
  };

  const handleRemove = () => {
    onOpenChange(false);
    setPassword("");
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          title="Password"
          description="Require a password to access this service."
        />

        <GradientFadedBackground />

        <div className="px-8">
          <Input
            type="password"
            value={isMasked ? "**********" : password}
            name={"service-password"}
            showPasswordToggle={!isMasked}
            onChange={(e) => {
              if (isMasked) {
                setIsMasked(false);
                setPassword(e.target.value.replace(/\*/g, ""));
              } else {
                setPassword(e.target.value);
              }
            }}
            placeholder="Enter password..."
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            onKeyDown={(e) => {
              if (e.key === "Enter" && password.trim()) {
                handleSave();
              }
            }}
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
                    disabled={!password.trim()}
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
                    disabled={!password.trim()}
                  >
                    Add Password
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
