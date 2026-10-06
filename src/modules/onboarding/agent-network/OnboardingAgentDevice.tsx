import Button from "@components/Button";
import { DeviceCard } from "@components/DeviceCard";
import { Modal, ModalContent } from "@components/modal/Modal";
import { ArrowRightIcon, CheckCircle2Icon, DownloadIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import type { Peer } from "@/interfaces/Peer";
import { WaitingForDevice } from "@/modules/onboarding/OnboardingDevices";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  // onBack is left out when this is the flow's first step.
  onBack?: () => void;
  onNext: () => void;
  // device is the peer that counts as the operator's device once it joins the
  // network. The parent polls /peers and picks it.
  device?: Peer;
};

// OnboardingAgentDevice covers the quickstart's "Add Your Device to the
// Network" step: agent-network endpoints are reachable only over the
// NetBird overlay, so the operator's device must run the client and be
// authenticated before anything else works.
export const OnboardingAgentDevice = ({ onBack, onNext, device }: Props) => {
  const [open, setOpen] = useState(false);

  // Close the install modal automatically once the device shows up so the
  // operator lands back on the connected state without an extra click.
  useEffect(() => {
    if (device) setOpen(false);
  }, [device]);

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
        className={"flex flex-col items-center justify-center min-h-[140px]"}
        data-testid={"agent-network-device-status"}
        data-connected={!!device}
      >
        {device ? (
          <div className={"flex flex-col items-center gap-3"}>
            <DeviceCard device={device} className={"justify-center"} />
            <div className={"flex items-center gap-2 text-sm"}>
              <CheckCircle2Icon size={16} className={"text-green-500"} />
              <span>Your device is connected to the network.</span>
            </div>
          </div>
        ) : (
          <WaitingForDevice text={"Waiting for your device to connect"} />
        )}
      </div>

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        {onBack && (
          <Button variant={"secondary"} onClick={onBack}>
            Go Back
          </Button>
        )}
        {device ? (
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
