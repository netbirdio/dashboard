import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import * as React from "react";
import ConfettiExplosion from "react-confetti-explosion";
import { FirewallGPTConfirmation } from "@/interfaces/FirewallGPT";
import { Policy } from "@/interfaces/Policy";

type Props = {
  request_id: string;
  policy?: Policy;
  open: boolean;
  setOpen: (open: boolean) => void;
};
export const FirewallGPTSuccessModal = ({
  request_id,
  policy,
  open,
  setOpen,
}: Props) => {
  const firewallGPTRequest = useApiCall<FirewallGPTConfirmation>(
    "/integrations/assistant",
    true,
  );

  const sendFeedback = async (feedback: "yes" | "no") => {
    await firewallGPTRequest.put({
      request_id,
      confirmation: feedback,
    });
    setOpen(false);
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent maxWidthClass={"max-w-md relative"} showClose={false}>
        <GradientFadedBackground />
        <div
          className={
            "mx-auto text-center flex flex-col items-center justify-center "
          }
        >
          <ConfettiExplosion
            zIndex={50}
            force={0.3}
            particleSize={8}
            duration={3000}
            particleCount={120}
            width={1600}
            colors={["#f68330", "#ffc196", "#ffffff"]}
          />
          <h2 className={"text-xl my-0 leading-[1.5] mb-2 max-w-xs"}>
            Policy {"'" + policy?.name + "'"} has been created successfully!
          </h2>
          <Paragraph className={cn("text-sm text-center max-w-xs")}>
            {
              "How would you rate your experience with NetBird's Smart Firewall?"
            }
          </Paragraph>

          <div className={"flex justify-center items-center gap-4"}>
            <Button
              variant={"secondary"}
              className={"w-full mt-4"}
              size={"xs"}
              onClick={() => sendFeedback("yes")}
            >
              <ThumbsUp size={16} className={"text-green-500"} />
            </Button>
            <Button
              variant={"secondary"}
              className={"w-full mt-4"}
              size={"xs"}
              onClick={() => sendFeedback("no")}
            >
              <ThumbsDown size={16} className={"text-red-500"} />
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
};
