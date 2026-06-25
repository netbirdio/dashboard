import Button from "@components/Button";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";

type Props = {
  onFinish: () => void;
};

// OnboardingAgentEnd wraps up the flow and points at Usage & Logs to confirm
// requests are being recorded, matching the quickstart's "Verify" step.
export const OnboardingAgentEnd = ({ onFinish }: Props) => {
  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          You&apos;re all set! <br />
          Your agent network is ready.
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {`Run your agent or send a test request with an allowed model. Open
          Usage & Logs to confirm caller identity, model, tokens, and cost.`}
        </div>
      </div>

      <div className={"mt-4 flex items-center justify-center"}>
        <Button variant={"secondaryLighter"} onClick={onFinish}>
          Go to Agent Network
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
};
