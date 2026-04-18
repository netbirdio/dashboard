"use client";

import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import PinCodeInput from "@components/PinCodeInput";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import React, { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPin: string;
  isEnabled: boolean;
  onSave: (pin: string) => void;
  onRemove: () => void;
};

export default function AuthPinModal({
  open,
  onOpenChange,
  currentPin,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const { t } = useI18n();
  const [pin, setPin] = useState(currentPin);
  const [isMasked, setIsMasked] = useState(isEnabled && currentPin === "");
  const isEditing = isEnabled;

  const handleSave = () => {
    if (pin.length === 6) {
      onOpenChange(false);
      onSave(pin);
    }
  };

  const handleRemove = () => {
    onOpenChange(false);
    setPin("");
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          title={t("reverseProxy.authPinTitle")}
          description={t("reverseProxy.authPinDescription")}
        />

        <GradientFadedBackground />

        <div className="px-8">
          <div className="flex justify-center">
            {isMasked ? (
              <PinCodeInput
                value={"******"}
                onChange={(value) => {
                  const digit = value.replace(/\D/g, "");
                  setPin(digit);
                  setIsMasked(false);
                }}
                type={"password"}
              />
            ) : (
              <PinCodeInput value={pin} onChange={setPin} />
            )}
          </div>
          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  {t("reverseProxy.remove")}
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">{t("common.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={pin.length !== 6}
                  >
                    {t("actions.save")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">{t("common.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={pin.length !== 6}
                  >
                    {t("reverseProxy.addPin")}
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
