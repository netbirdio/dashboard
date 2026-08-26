import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Sparkles } from "lucide-react";
import * as React from "react";

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const FirewallGPTAccessFormSuccessModal = ({ open, setOpen }: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent showClose={true} maxWidthClass={"max-w-sm"}>
        <GradientFadedBackground />
        <div
          className={
            "flex items-center justify-center flex-col gap-3 px-6 relative z-[1]"
          }
        >
          <Sparkles size={26} className={"text-netbird-500"} />
          <div className={"text-xl font-medium"}>Thank you for signing up!</div>
          <div className={"text-sm text-center mb-2"}>
            <p
              className={"!text-nb-gray-300"}
            >{`We'll send you an email once NetBird's Smart Firewall is ready to use in your account.`}</p>
          </div>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"w-full"}
            onClick={() => setOpen(false)}
          >
            Close Message
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
};
