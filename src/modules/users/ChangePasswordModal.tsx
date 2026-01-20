"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Separator from "@components/Separator";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import { useApiCall } from "@utils/api";
import { KeyRound, LockIcon } from "lucide-react";
import React, { useMemo, useState } from "react";

type Props = {
  children: React.ReactNode;
  userId?: string;
};

export default function ChangePasswordModal({
  children,
  userId,
}: Readonly<Props>) {
  const [modal, setModal] = useState(false);

  return (
    <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
      <ModalTrigger asChild>{children}</ModalTrigger>
      <ChangePasswordModalContent
        userId={userId}
        onSuccess={() => setModal(false)}
      />
    </Modal>
  );
}

type ModalProps = {
  userId?: string;
  onSuccess?: () => void;
};

export function ChangePasswordModalContent({
  userId,
  onSuccess,
}: Readonly<ModalProps>) {
  const passwordRequest = useApiCall<void>(`/users/${userId}/password`, true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentPasswordError = useMemo(() => {
    if (currentPassword.length === 0) return undefined;
    return undefined;
  }, [currentPassword]);

  const newPasswordError = useMemo(() => {
    if (newPassword.length === 0) return undefined;
    if (newPassword.length < 8) return "Password must be at least 8 characters";
    return undefined;
  }, [newPassword]);

  const confirmPasswordError = useMemo(() => {
    if (confirmPassword.length === 0) return undefined;
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return undefined;
  }, [newPassword, confirmPassword]);

  const isDisabled = useMemo(() => {
    if (currentPassword.length === 0) return true;
    if (newPassword.length < 8) return true;
    if (confirmPassword.length === 0) return true;
    if (newPassword !== confirmPassword) return true;
    return false;
  }, [currentPassword, newPassword, confirmPassword]);

  const changePassword = async () => {
    if (!userId || isDisabled) return;

    setIsLoading(true);
    notify({
      title: "Password changed",
      description: "Your password has been successfully changed.",
      promise: passwordRequest
        .put({
          old_password: currentPassword,
          new_password: newPassword,
        })
        .then(() => {
          onSuccess && onSuccess();
        })
        .finally(() => {
          setIsLoading(false);
        }),
      loadingMessage: "Changing password...",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isDisabled && !isLoading) {
      changePassword();
    }
  };

  return (
    <ModalContent maxWidthClass={"max-w-lg"}>
      <ModalHeader
        icon={<KeyRound size={18} />}
        title={"Change Password"}
        description={"Update your account password."}
        color={"netbird"}
      />

      <Separator />

      <form className={"px-8 py-6 flex flex-col gap-6"} onSubmit={changePassword}>
        <div>
          <Label>Current Password</Label>
          <HelpText>Enter your current password to verify your identity.</HelpText>
          <Input
            type="password"
            placeholder={"Enter current password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            showPasswordToggle
            error={currentPasswordError}
            customPrefix={<LockIcon size={16} className={"text-nb-gray-300"} />}
            name={"current-password"}
            autoComplete={"current-password"}
          />
        </div>

        <div>
          <Label>New Password</Label>
          <HelpText>
            Enter your new password. Must be at least 8 characters.
          </HelpText>
          <Input
            type="password"
            placeholder={"Enter new password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            showPasswordToggle
            error={newPasswordError}
            customPrefix={<LockIcon size={16} className={"text-nb-gray-300"} />}
            name={"new-password"}
            autoComplete={"new-password"}
          />
        </div>

        <div>
          <Label>Confirm New Password</Label>
          <HelpText>Re-enter your new password to confirm.</HelpText>
          <Input
            type="password"
            placeholder={"Confirm new password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            showPasswordToggle
            error={confirmPasswordError}
            customPrefix={<LockIcon size={16} className={"text-nb-gray-300"} />}
            name={"confirm-password"}
            autoComplete={"confirm-password"}
          />
        </div>
      </form>

      <ModalFooter className={"items-center"}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            disabled={isDisabled || isLoading}
            onClick={changePassword}
          >
            Change Password
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}