import Button from "@components/Button";
import * as React from "react";
import { Policy } from "@/interfaces/Policy";
import { OnboardingPolicy } from "@/modules/onboarding/OnboardingPolicy";

type Props = {
  policy?: Policy;
  onNext?: () => void;
  onToggle?: (policy: Policy) => void;
};

export const OnboardingExplainDefaultPolicy = ({
  policy,
  onNext,
  onToggle,
}: Props) => {
  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
            {`Set the rules. You're in control`}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
            {`With NetBird, you decide who gets access to what.
            We've already set up an access policy for your devices.`}
        </div>

        {policy && (
          <div
            className={
              "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
            }
          >
              Flip the switch, then try pinging your other device again to see how it affects the connection.
          </div>
        )}
      </div>

      <div>
        <OnboardingPolicy policy={policy} onToggle={onToggle} />
      </div>

      <Button variant={"primary"} onClick={onNext}>
        Continue
      </Button>
    </div>
  );
};
