import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent } from "@components/modal/Modal";
import Steps from "@components/Steps";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  resource?: NetworkResource;
  device?: Peer;
  onNext?: () => void;
  onTroubleshootingClick?: () => void;
};

export const OnboardingTestResource = ({
  resource,
  device,
  onNext,
  onTroubleshootingClick,
}: Props) => {
  const [open, setOpen] = useState(false);

  const isSubnet = resource?.type === "subnet";
  const isWildCard = resource?.address.includes("*");
  const isHost = resource?.type === "host";

  const pingAddress = useMemo(() => {
    let a = resource?.address || "";
    if (isHost && a.endsWith("/32")) {
      a = a.slice(0, -3);
    }
    if (isWildCard) return `(any subdomain of ${a})`;
    return isSubnet ? `(resource ip in your subnet)` : a;
  }, [isWildCard, isHost, isSubnet, resource?.address]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {`Let's put that connection to the test`}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Nice work connecting your client device! Now, let’s have a little fun and test if it can reach your resource.`}
        </div>
      </div>

      <Steps className={"stepper-bg-variant"}>
        <Steps.Step step={1}>
          <p className={"!text-nb-gray-300"}>
            Open your command line and run this command from{" "}
            <span className={cn(device && "text-white")}>
              {device?.name || "your device"}
            </span>{" "}
            to ping your resource.
          </p>
          <Code showCopyIcon={!isSubnet && !isWildCard}>
            ping {pingAddress}
          </Code>
        </Steps.Step>
        <Steps.Step step={2} line={false} className={"pb-0"} disabled={!device}>
          <p className={"!text-nb-gray-300"}>
            Everything working? Great! You can now continue with the onboarding.
            If something isn’t right, please check our{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/troubleshooting-client"}
              target={"_blank"}
              onClick={onTroubleshootingClick}
            >
              troubleshooting guide
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </p>
          <div className={"mt-2"}>
            <Button
              variant={"secondaryLighter"}
              onClick={onNext}
              className={"w-full"}
            >
              It works! - Continue
            </Button>
          </div>
        </Steps.Step>
      </Steps>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <SetupModalContent title={"Install NetBird"} />
        </ModalContent>
      </Modal>
    </div>
  );
};
