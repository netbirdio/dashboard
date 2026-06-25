import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { ArrowRightIcon, CheckCircle2Icon, DownloadIcon, Loader2Icon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  onBack: () => void;
  onNext: () => void;
  // deviceConnected is true once at least one peer has joined the network.
  // The parent polls /peers and flips this; we use it to surface the
  // connected state and let the operator continue.
  deviceConnected: boolean;
};

// OnboardingAgentDevice covers the quickstart's "Add Your Device to the
// Network" step: agent-network endpoints are reachable only over the
// NetBird overlay, so the operator's device must run the client and be
// authenticated before anything else works.
export const OnboardingAgentDevice = ({
  onBack,
  onNext,
  deviceConnected,
}: Props) => {
  const [open, setOpen] = useState(false);

  // Close the install modal automatically once the device shows up so the
  // operator lands back on the connected state without an extra click.
  useEffect(() => {
    if (deviceConnected) setOpen(false);
  }, [deviceConnected]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>Connect your device</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Agent Network endpoints are private and reachable only over the
          NetBird overlay. Install the client and sign in to join the network
          with keyless, encrypted access.`}
        </div>
      </div>

      <div
        className={
          "mt-4 flex items-center justify-center gap-2 rounded-md border border-nb-gray-900 bg-nb-gray-920 py-3 px-4 text-sm"
        }
      >
        {deviceConnected ? (
          <>
            <CheckCircle2Icon size={16} className={"text-green-500"} />
            <span>Your device is connected to the network.</span>
          </>
        ) : (
          <>
            <Loader2Icon size={16} className={"animate-spin text-nb-gray-300"} />
            <span className={"text-nb-gray-300"}>
              Waiting for your device to connect…
            </span>
          </>
        )}
      </div>

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          Go Back
        </Button>
        {deviceConnected ? (
          <Button variant={"primary"} onClick={onNext}>
            Continue
            <ArrowRightIcon size={16} />
          </Button>
        ) : (
          <Button variant={"primary"} onClick={() => setOpen(true)}>
            <DownloadIcon size={16} />
            Install NetBird
          </Button>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className={"!z-[70]"}>
          <SetupModalContent title={"Install NetBird"} isUserDevice={true} />
        </ModalContent>
      </Modal>
    </div>
  );
};
