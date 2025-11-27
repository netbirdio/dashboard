import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import Steps from "@components/Steps";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";

type Props = {
  firstDevice?: Peer;
  secondDevice?: Peer;
  policy?: Policy;
  onNext?: () => void;
  onTroubleshootingClick?: () => void;
};

export const OnboardingTestP2P = ({
  firstDevice,
  secondDevice,
  onNext,
  onTroubleshootingClick,
}: Props) => {
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
          {
            "Nice work connecting your devices! Now, let’s have a little fun and test if they can talk to each other."
          }
        </div>
      </div>

      <Steps className={"stepper-bg-variant"}>
        <Steps.Step step={1}>
          <p className={"!text-nb-gray-300"}>
            Run this command from{" "}
            <span className={"text-white"}>{firstDevice?.name}</span> to ping{" "}
            <span className={"text-white"}>{secondDevice?.name}</span>.
            You should receive a response if the connection is working.
          </p>
          <Code message={"Command has been copied successfully"}>
            ping {secondDevice?.ip}
          </Code>
        </Steps.Step>
        <Steps.Step step={2} line={false} className={"pb-0"}>
          <p className={"!text-nb-gray-300"}>
            Everything working? Great! You can now continue with the onboarding.
            If something isn’t right, please check our{" "}
            <InlineLink
              onClick={onTroubleshootingClick}
              href={"https://docs.netbird.io/how-to/troubleshooting-client"}
              target={"_blank"}
            >
              troubleshooting guide
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </p>
          <div className={"mt-2"}>
            <Button
              variant={"secondaryLighter"}
              className={"w-full"}
              onClick={onNext}
            >
              It works! - Continue
            </Button>
          </div>
        </Steps.Step>
      </Steps>
    </div>
  );
};
