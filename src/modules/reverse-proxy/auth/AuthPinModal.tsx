import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import PinCodeInput from "@components/PinCodeInput";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import React, { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

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
  const t = useTranslations();
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
          title={t("reverseProxy.pinCode")}
          description={t("reverseProxy.pinCodeDescription")}
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
                <Button variant="danger-text" data-testid="remove-pin" onClick={handleRemove}>
                  {t("common.remove")}
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
                    {t("common.save")}
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
                    data-testid="submit-pin"
                  >
                    Add PIN
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
