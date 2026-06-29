import InlineLink from "@components/InlineLink";
import { Modal, ModalPortal } from "@components/modal/Modal";
import { NetBirdLogo } from "@components/NetBirdLogo";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useEffect, useReducer } from "react";
import { useSWRConfig } from "swr";
import { HubspotFormField } from "@/contexts/AnalyticsProvider";
import type { Peer } from "@/interfaces/Peer";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";
import { AgentNetworkSignupForm } from "@/modules/onboarding/agent-network/AgentNetworkSignupForm";
import { OnboardingAgentConfigure } from "@/modules/onboarding/agent-network/OnboardingAgentConfigure";
import { OnboardingAgentDevice } from "@/modules/onboarding/agent-network/OnboardingAgentDevice";
import { OnboardingAgentEnd } from "@/modules/onboarding/agent-network/OnboardingAgentEnd";
import { OnboardingAgentPolicy } from "@/modules/onboarding/agent-network/OnboardingAgentPolicy";
import { OnboardingAgentProvider } from "@/modules/onboarding/agent-network/OnboardingAgentProvider";
import { OnboardingAgentWelcome } from "@/modules/onboarding/agent-network/OnboardingAgentWelcome";
import { useAgentNetworkFirstRunSetup } from "@/modules/onboarding/agent-network/useAgentNetworkFirstRunSetup";

// Step indices for the Agent Network onboarding. Kept as a flat sequence
// (no intent branching like the regular onboarding) since there's a single
// path that mirrors the agent-network quickstart guide.
const STEP = {
  SIGNUP: 1,
  WELCOME: 2,
  DEVICE: 3,
  PROVIDER: 4,
  POLICY: 5,
  CONFIGURE: 6,
  END: 7,
} as const;

const MAX_STEPS = STEP.END;

type Props = {
  initialStep: number;
  // onStepChange syncs the current step back to localStorage (handled by
  // OnboardingProvider) so a refresh resumes where the operator left off.
  onStepChange: (step: number) => void;
  // signupPending mirrors the account's signup_form_pending flag. When true the
  // flow opens on the signup step (step 1); when false that step is skipped.
  signupPending: boolean;
  onSignupSubmit: (fields: HubspotFormField[]) => void;
  onSkip: (step: number) => void;
  onFinish: () => void;
};

export const AgentNetworkOnboarding = ({
  initialStep,
  onStepChange,
  signupPending,
  onSignupSubmit,
  onSkip,
  onFinish,
}: Props) => {
  const [step, dispatch] = useReducer(
    (_: number, next: number) => next,
    // Start on the signup step while it's pending; otherwise resume the stored
    // step but never land back on signup once it's done.
    signupPending
      ? STEP.SIGNUP
      : Math.min(Math.max(initialStep, STEP.WELCOME), MAX_STEPS),
  );

  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { mutate } = useSWRConfig();
  const deviceConnected = (peers?.length ?? 0) > 0;

  // First-run prep: seed a "Users" source group (with the current user in it)
  // so the policy step has something to select, and remove the permissive
  // "Default" Access Control policy that doesn't belong in Agent Network.
  useAgentNetworkFirstRunSetup(true);

  // Advance/retreat and persist the new step so a refresh mid-onboarding
  // resumes in place. We persist here rather than in an effect so the
  // (intentionally unstable) onStepChange callback never drives a render loop.
  const goTo = (next: number) => {
    dispatch(next);
    onStepChange(next);
  };
  const goNext = () => goTo(Math.min(step + 1, MAX_STEPS));
  const goBack = () => goTo(Math.max(step - 1, STEP.WELCOME));

  // If signup is no longer pending (already submitted), don't sit on the
  // signup step — mirrors the cloud onboarding's "skip survey if submitted".
  useEffect(() => {
    if (!signupPending && step === STEP.SIGNUP) goTo(STEP.WELCOME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupPending, step]);

  // Poll for peers while waiting on the device step, in case window focus
  // doesn't trigger a refresh when the operator connects their client.
  useEffect(() => {
    if (step !== STEP.DEVICE || deviceConnected) return;
    const interval = setInterval(() => mutate("/peers"), 5000);
    return () => clearInterval(interval);
  }, [step, deviceConnected, mutate]);

  return (
    <Modal open={true}>
      <ModalPortal>
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          asChild={true}
          className={
            "h-full w-screen fixed z-[50] left-0 top-0 bg-nb-gray-950 flex overflow-y-auto"
          }
        >
          <div>
            <VisuallyHidden asChild>
              <DialogTitle>Agent Network Onboarding</DialogTitle>
            </VisuallyHidden>
            <div
              className={
                "sm:px-4 py-10 max-w-2xl mx-auto flex flex-col items-center w-full"
              }
            >
              <NetBirdLogo size={"large"} mobile={false} />

              <div className={"w-full flex flex-col items-center pb-10 mt-8 sm:mt-10"}>
                <Card
                  className={cn(
                    "w-full",
                    step === STEP.SIGNUP && "max-w-lg",
                    step === STEP.END && "max-w-2xl",
                  )}
                >
                  <Stepper step={step} maxSteps={MAX_STEPS} />

                  <AIProvidersProvider>
                    {step === STEP.SIGNUP && (
                      <AgentNetworkSignupForm
                        onSubmit={(fields) => {
                          onSignupSubmit(fields);
                          goNext();
                        }}
                      />
                    )}
                    {step === STEP.WELCOME && (
                      <OnboardingAgentWelcome onNext={goNext} />
                    )}
                    {step === STEP.DEVICE && (
                      <OnboardingAgentDevice
                        deviceConnected={deviceConnected}
                        onBack={goBack}
                        onNext={goNext}
                      />
                    )}
                    {step === STEP.PROVIDER && (
                      <OnboardingAgentProvider onBack={goBack} onNext={goNext} />
                    )}
                    {step === STEP.POLICY && (
                      <OnboardingAgentPolicy onBack={goBack} onNext={goNext} />
                    )}
                    {step === STEP.CONFIGURE && (
                      <OnboardingAgentConfigure
                        onBack={goBack}
                        onNext={goNext}
                      />
                    )}
                    {step === STEP.END && (
                      <OnboardingAgentEnd onFinish={onFinish} />
                    )}
                  </AIProvidersProvider>
                </Card>

                {step !== STEP.SIGNUP && step !== STEP.END && (
                  <span
                    className={
                      "text-sm text-nb-gray-400 font-light pt-10 text-center px-4"
                    }
                  >
                    Already know how Agent Network works?
                    <InlineLink
                      href={"#"}
                      className={"!text-nb-gray-200 ml-1"}
                      onClick={() => onSkip(step)}
                    >
                      Skip to Dashboard
                    </InlineLink>
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </ModalPortal>
    </Modal>
  );
};

const Stepper = ({ step, maxSteps }: { step: number; maxSteps: number }) => {
  if (step <= 0) return null;
  return (
    <div className={"flex gap-2 w-full items-center justify-center mb-6 mt-2"}>
      {Array.from({ length: maxSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-8 h-1 rounded-full bg-nb-gray-800",
            step >= index + 1 && "bg-netbird",
          )}
        />
      ))}
    </div>
  );
};

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "px-6 sm:px-8 py-8 pt-6",
        "bg-nb-gray-940 border border-nb-gray-910 rounded-lg relative",
        className,
      )}
    >
      <GradientFadedBackground className={"opacity-0"} />
      {children}
    </div>
  );
};
