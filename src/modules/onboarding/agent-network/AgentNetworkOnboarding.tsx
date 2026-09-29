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
import { useLoggedInUser } from "@/contexts/UsersProvider";
import type { Peer } from "@/interfaces/Peer";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";
import { AgentNetworkSignupForm } from "@/modules/onboarding/agent-network/AgentNetworkSignupForm";
import {
  AGENT_STEP,
  AgentStep,
  agentSteps,
  initialAgentStep,
} from "@/modules/onboarding/agent-network/agentNetworkSteps";
import { ownDeviceConnected } from "@/modules/onboarding/agent-network/existingAccountOnboarding";
import { OnboardingAgentConfigure } from "@/modules/onboarding/agent-network/OnboardingAgentConfigure";
import { OnboardingAgentDevice } from "@/modules/onboarding/agent-network/OnboardingAgentDevice";
import { OnboardingAgentEnd } from "@/modules/onboarding/agent-network/OnboardingAgentEnd";
import { OnboardingAgentGateway } from "@/modules/onboarding/agent-network/OnboardingAgentGateway";
import { OnboardingAgentPolicy } from "@/modules/onboarding/agent-network/OnboardingAgentPolicy";
import { OnboardingAgentProvider } from "@/modules/onboarding/agent-network/OnboardingAgentProvider";
import { OnboardingAgentWelcome } from "@/modules/onboarding/agent-network/OnboardingAgentWelcome";
import { useAgentNetworkFirstRunSetup } from "@/modules/onboarding/agent-network/useAgentNetworkFirstRunSetup";

// The flow is a flat sequence (no intent branching like the regular
// onboarding) that mirrors the agent-network quickstart guide.
type Nav = {
  step: AgentStep;
  // Whether the last move went back, so a step with nothing to do can leave
  // in the same direction.
  back: boolean;
};

type Props = {
  initialStep: AgentStep;
  // onStepChange syncs the current step back to localStorage (handled by
  // OnboardingProvider) so a refresh resumes where the operator left off.
  onStepChange: (step: AgentStep) => void;
  // gatewayStep adds the gateway step before the provider step, for the
  // NetBird Cloud signups where a managed gateway can be offered.
  gatewayStep: boolean;
  // existingAccount marks an account that existed before its Agent Network
  // onboarding: it already has devices, groups and policies of its own.
  existingAccount: boolean;
  // signupPending mirrors the account's signup_form_pending flag. When true the
  // flow opens on the signup step; when false that step is skipped.
  signupPending: boolean;
  onSignupSubmit: (fields: HubspotFormField[]) => void;
  // onSkip receives the 1-based position of the step the operator skipped
  // from.
  onSkip: (position: number) => void;
  onFinish: () => void;
};

export const AgentNetworkOnboarding = ({
  initialStep,
  onStepChange,
  gatewayStep,
  existingAccount,
  signupPending,
  onSignupSubmit,
  onSkip,
  onFinish,
}: Props) => {
  const steps = agentSteps(gatewayStep);
  const [{ step, back }, dispatch] = useReducer((_: Nav, next: Nav) => next, {
    step: initialAgentStep(initialStep, steps, signupPending),
    back: false,
  });
  const position = steps.indexOf(step);

  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { loggedInUser } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const deviceConnected = existingAccount
    ? ownDeviceConnected(peers, loggedInUser?.id)
    : (peers?.length ?? 0) > 0;

  // First-run prep: seed a "Users" source group (with the current user in it)
  // so the policy step has something to select, and remove the permissive
  // "Default" Access Control policy that doesn't belong in Agent Network.
  // Never on an existing account, whose peers may rely on that policy.
  useAgentNetworkFirstRunSetup(!existingAccount);

  // Advance/retreat and persist the new step so a refresh mid-onboarding
  // resumes in place. We persist here rather than in an effect so the
  // (intentionally unstable) onStepChange callback never drives a render loop.
  const goTo = (next: AgentStep, isBack = false) => {
    dispatch({ step: next, back: isBack });
    onStepChange(next);
  };
  const goNext = () => goTo(steps[Math.min(position + 1, steps.length - 1)]);
  const goBack = () =>
    goTo(
      steps[Math.max(position - 1, steps.indexOf(AGENT_STEP.WELCOME))],
      true,
    );
  const skipStep = () => (back ? goBack() : goNext());

  // If signup is no longer pending (already submitted), don't sit on the
  // signup step — mirrors the cloud onboarding's "skip survey if submitted".
  useEffect(() => {
    if (!signupPending && step === AGENT_STEP.SIGNUP) goTo(AGENT_STEP.WELCOME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupPending, step]);

  // Poll for peers while waiting on the device step, in case window focus
  // doesn't trigger a refresh when the operator connects their client.
  useEffect(() => {
    if (step !== AGENT_STEP.DEVICE || deviceConnected) return;
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
          <div data-testid={"agent-network-onboarding"}>
            <VisuallyHidden asChild>
              <DialogTitle>Agent Network Onboarding</DialogTitle>
            </VisuallyHidden>
            <div
              className={
                "sm:px-4 py-10 max-w-2xl mx-auto flex flex-col items-center w-full"
              }
            >
              <NetBirdLogo size={"large"} mobile={false} />

              <div
                className={
                  "w-full flex flex-col items-center pb-10 mt-8 sm:mt-10"
                }
              >
                <Card
                  className={cn(
                    "w-full",
                    step === AGENT_STEP.SIGNUP && "max-w-lg",
                    step === AGENT_STEP.END && "max-w-2xl",
                  )}
                >
                  <Stepper step={position + 1} maxSteps={steps.length} />

                  <AIProvidersProvider>
                    {step === AGENT_STEP.SIGNUP && (
                      <AgentNetworkSignupForm
                        onSubmit={(fields) => {
                          onSignupSubmit(fields);
                          goNext();
                        }}
                      />
                    )}
                    {step === AGENT_STEP.WELCOME && (
                      <OnboardingAgentWelcome onNext={goNext} />
                    )}
                    {step === AGENT_STEP.DEVICE && (
                      <OnboardingAgentDevice
                        deviceConnected={deviceConnected}
                        onBack={goBack}
                        onNext={goNext}
                      />
                    )}
                    {step === AGENT_STEP.GATEWAY && (
                      <OnboardingAgentGateway
                        onBack={goBack}
                        onNext={goNext}
                        onSkip={skipStep}
                      />
                    )}
                    {step === AGENT_STEP.PROVIDER && (
                      <OnboardingAgentProvider
                        onBack={goBack}
                        onNext={goNext}
                      />
                    )}
                    {step === AGENT_STEP.POLICY && (
                      <OnboardingAgentPolicy onBack={goBack} onNext={goNext} />
                    )}
                    {step === AGENT_STEP.CONFIGURE && (
                      <OnboardingAgentConfigure
                        onBack={goBack}
                        onNext={goNext}
                      />
                    )}
                    {step === AGENT_STEP.END && (
                      <OnboardingAgentEnd
                        onFinish={onFinish}
                        showLiveChecklist={gatewayStep}
                      />
                    )}
                  </AIProvidersProvider>
                </Card>

                {step !== AGENT_STEP.SIGNUP && step !== AGENT_STEP.END && (
                  <span
                    className={
                      "text-sm text-nb-gray-400 font-light pt-10 text-center px-4"
                    }
                  >
                    Already know how Agent Network works?
                    <InlineLink
                      href={"#"}
                      className={"!text-nb-gray-200 ml-1"}
                      onClick={() => onSkip(position + 1)}
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
