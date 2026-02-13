import InlineLink from "@components/InlineLink";
import { Modal, ModalPortal } from "@components/modal/Modal";
import { NetBirdLogo } from "@components/NetBirdLogo";
import { notify } from "@components/Notification";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isNetBirdHosted } from "@utils/netbird";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useSWRConfig } from "swr";
import { HubspotFormField } from "@/contexts/AnalyticsProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { OnboardingAddResource } from "@/modules/onboarding/networks/OnboardingAddResource";
import { OnboardingAddRoutingPeer } from "@/modules/onboarding/networks/OnboardingAddRoutingPeer";
import { OnboardingAddUserDevice } from "@/modules/onboarding/networks/OnboardingAddUserDevice";
import { OnboardingExplainPolicy } from "@/modules/onboarding/networks/OnboardingExplainPolicy";
import { OnboardingTestResource } from "@/modules/onboarding/networks/OnboardingTestResource";
import { OnboardingDevices } from "@/modules/onboarding/OnboardingDevices";
import { OnboardingEnd } from "@/modules/onboarding/OnboardingEnd";
import { OnboardingIntent } from "@/modules/onboarding/OnboardingIntent";
import { OnboardingSurvey } from "@/modules/onboarding/OnboardingSurvey";
import { OnboardingExplainDefaultPolicy } from "@/modules/onboarding/p2p/OnboardingExplainDefaultPolicy";
import { OnboardingFirstDevice } from "@/modules/onboarding/p2p/OnboardingFirstDevice";
import { OnboardingSecondDevice } from "@/modules/onboarding/p2p/OnboardingSecondDevice";
import { OnboardingTestP2P } from "@/modules/onboarding/p2p/OnboardingTestP2P";

export interface OnboardingState {
  intent: Intent;
  step: number;
  finished_at?: string;
  survey_submitted_at?: string;
  skipped?: boolean;
}

export enum Intent {
  P2P = "p2p",
  NETWORKS = "networks",
}

type OnboardingAction =
  | { type: "SET_INTENT"; payload: OnboardingState["intent"] }
  | { type: "SET_FINISHED_AT"; payload: string }
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_SURVEY_SUBMITTED_AT"; payload: string }
  | { type: "RESET" }
  | { type: "SKIP" };

const onboardingReducer = (
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState => {
  switch (action.type) {
    case "SET_INTENT":
      return { ...state, intent: action.payload };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_FINISHED_AT":
      return { ...state, finished_at: action.payload };
    case "SET_SURVEY_SUBMITTED_AT":
      return { ...state, survey_submitted_at: action.payload };
    case "RESET":
      return { intent: Intent.P2P, step: 1 };
    case "SKIP":
      return { ...state, skipped: true };
    default:
      return state;
  }
};

type Props = {
  initial: OnboardingState;
  setLocalOnboarding: (onboarding: OnboardingState) => void;
  peers: Peer[];
  onSurveySubmit?: (fields: HubspotFormField[]) => void;
  onSkip: (intent: Intent, step: number) => void;
  onFinish: (n?: Network) => void;
  formSubmitted: boolean;
  onTroubleshootingClick?: (intent: Intent) => void;
  isOnboardingPending: boolean;
  domainCategory?: string;
};

export const Onboarding = ({
  initial,
  setLocalOnboarding,
  peers,
  onSurveySubmit,
  onSkip,
  onFinish,
  formSubmitted,
  onTroubleshootingClick,
  isOnboardingPending,
  domainCategory,
}: Props) => {
  const { data: networks } = useFetchApi<Network[]>("/networks", true, false);
  const { data: policies } = useFetchApi<Policy[]>("/policies", true);
  const router = useRouter();

  const resourceRequest = useApiCall<NetworkResource>("/networks", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);
  const policyRequest = useApiCall<Policy>("/policies", true);
  const { mutate } = useSWRConfig();

  const [onboarding, dispatch] = useReducer(onboardingReducer, initial);
  const { step, intent } = onboarding;

  const [resource, setResource] = useState<NetworkResource>();
  const [firstRoutingPeer, setFirstRoutingPeer] = useState<Peer>();
  const [useCases, setUseCases] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);

  const firstNetwork = useMemo(() => {
    return networks?.find((n) => n.name === "My First Network") ?? undefined;
  }, [networks]);

  const firstDevice = useMemo(() => {
    return (
      peers?.find((p) => p.id !== firstRoutingPeer?.id && p.user_id !== "") ??
      undefined
    );
  }, [firstRoutingPeer?.id, peers]);

  const secondDevice = useMemo(() => {
    return (
      peers?.find(
        (p) => p.id !== firstDevice?.id && p.id !== firstRoutingPeer?.id,
      ) ?? undefined
    );
  }, [peers, firstDevice, firstRoutingPeer]);

  const maxSteps = useMemo(() => {
    if (intent === Intent.P2P) return 7;
    return 8;
  }, [intent]);

  const showWaitingForDevices = useMemo(() => {
    if (intent === Intent.NETWORKS) {
      return step === 4 || step === 5 || step === 6 || step === 7;
    } else {
      return step === 3 || step === 4 || step === 5 || step === 6;
    }
  }, [intent, step]);

  const policy = useMemo(() => {
    if (intent === Intent.P2P) {
      return policies?.find((p) => p.name === "Default");
    } else if (resource) {
      return policies?.find((p) => p.name.includes(resource?.name));
    }
  }, [intent, policies, resource]);

  const defaultPolicy = useMemo(() => {
    return policies?.find((p) => p.name === "Default");
  }, [policies]);

  const disableDefaultPolicy = async () => {
    if (!defaultPolicy) return;
    if (defaultPolicy.enabled) return await togglePolicy(defaultPolicy, true);
  };

  const togglePolicy = async (p: Policy, ignoreNotification = false) => {
    if (!p) return;
    const rule = p?.rules?.[0];
    if (!rule) return;

    const enabled = p?.enabled || false;

    const sources = rule.sources
      ?.map((group) => {
        const g = group as Group;
        return g?.id;
      })
      .filter((x) => x !== undefined);
    const destinations = rule.destinations
      ?.map((group) => {
        const g = group as Group;
        return g?.id;
      })
      .filter((x) => x !== undefined);

    const request = policyRequest.put(
      {
        ...p,
        rules: [
          {
            ...rule,
            sources: sources || [],
            destinations: rule.destinationResource
              ? undefined
              : destinations || [],
          },
        ],
        enabled: !enabled,
      },
      `/${p.id}`,
    );

    if (ignoreNotification) {
      return request.then(() => mutate("/policies"));
    } else {
      notify({
        title: p.name + " Policy",
        description: `Policy was successfully ${
          !enabled ? "enabled" : "disabled"
        }`,
        loadingMessage: "Updating policy...",
        promise: request.then(() => mutate("/policies")),
        duration: 800,
      });
    }
  };

  useEffect(() => {
    if (firstNetwork && intent === Intent.NETWORKS && !firstRoutingPeer) {
      const firstRouterId = firstNetwork?.routers?.[0];
      if (firstRouterId) {
        routerRequest
          .get(`/${firstNetwork?.id}/routers/${firstRouterId}`)
          .then((r) => {
            const routingPeer =
              peers?.find((p) => p.id === r.peer) ?? undefined;
            if (!routingPeer) return;
            setFirstRoutingPeer(routingPeer);
          });
      }
    }
  }, [intent, firstNetwork, peers]);

  useEffect(() => {
    if (firstNetwork && intent === Intent.NETWORKS) {
      const firstResourceId = firstNetwork?.resources?.[0];
      if (firstResourceId) {
        resourceRequest
          .get(`/${firstNetwork?.id}/resources/${firstResourceId}`)
          .then((r) => {
            setResource(r);
          });
      }
    }
  }, [intent, firstNetwork]);

  /**
   * Polling every 5s if we are still waiting for devices to connect, in case browser focus does not trigger a refresh
   */
  useEffect(() => {
    if (
      (firstDevice && secondDevice) ||
      (firstDevice && firstRoutingPeer) ||
      !(step === 3 || step === 4 || step === 5)
    ) {
      return; // Stop polling if condition is met
    }

    const interval = setInterval(() => {
      mutate("/peers");
    }, 5000);

    return () => clearInterval(interval); // Clean up when dependencies change
  }, [firstDevice, secondDevice, firstRoutingPeer, step, mutate]);

  /**
   * Skip form if already submitted
   */
  useEffect(() => {
    if (formSubmitted && step === 1) {
      dispatch({
        type: "SET_STEP",
        payload: 2,
      });
    }
  }, [formSubmitted, step]);

  /**
   * Sync state with local storage
   */
  useEffect(() => {
    setLocalOnboarding(onboarding);
  }, [onboarding, setLocalOnboarding]);

  /**
   * Prefetch the first network page if it exists for faster navigation
   */
  useEffect(() => {
    if (!firstNetwork) return;
    router.prefetch(`/network?id=${firstNetwork.id}`);
  }, [firstNetwork, router]);

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
              <DialogTitle>Onboarding</DialogTitle>
            </VisuallyHidden>
            <div
              className={cn(
                "sm:px-4 py-10 max-w-6xl mx-auto flex flex-col items-center",
                intent === Intent.P2P && step === 3 && "max-w-4xl",
                intent === Intent.NETWORKS && step === 7 && "max-w-5xl",
              )}
            >
              <NetBirdLogo size={"large"} mobile={false} />

              <div
                className={
                  "grid grid-cols-1 md:grid-cols-12 gap-4 pb-10 mt-8 sm:mt-10"
                }
              >
                <Card
                  className={cn(
                    "max-w-2xl md:col-span-12",
                    step === 1 && "max-w-lg",
                    step === 3 &&
                      intent == "p2p" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 4 &&
                      intent == "p2p" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 5 &&
                      intent == "p2p" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 6 &&
                      intent == "p2p" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 3 && intent == "networks" && "max-w-xl ",
                    step === 4 &&
                      intent == "networks" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 5 &&
                      intent == "networks" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 6 &&
                      intent == "networks" &&
                      "md:col-span-7 lg:col-span-6",
                    step === 7 &&
                      intent == "networks" &&
                      "md:col-span-7 lg:col-span-6",
                    step === maxSteps && "max-w-2xl",
                  )}
                >
                  {isOnboardingPending && (
                    <Stepper
                      step={isNetBirdHosted() ? step : step - 1}
                      maxSteps={isNetBirdHosted() ? maxSteps : maxSteps - 1}
                    />
                  )}

                  {step === 1 && domainCategory && (
                    <OnboardingSurvey
                      domainCategory={domainCategory}
                      onSubmit={(fields) => {
                        dispatch({
                          type: "SET_SURVEY_SUBMITTED_AT",
                          payload: new Date().toISOString(),
                        });
                        onSurveySubmit?.(fields);

                        let u = fields?.find((f) => f.name === "use_case");
                        if (u) setUseCases(u.value);

                        let businessOrPersonal = fields?.find(
                          (f) => f.name === "is_company",
                        );
                        if (businessOrPersonal)
                          setIsBusiness(
                            businessOrPersonal.value === "Business",
                          );

                        if (isOnboardingPending) {
                          dispatch({
                            type: "SET_STEP",
                            payload: 2,
                          });
                        } else {
                          dispatch({
                            type: "SET_FINISHED_AT",
                            payload: new Date().toISOString(),
                          });
                        }
                      }}
                    />
                  )}
                  {step === 2 && (
                    <OnboardingIntent
                      useCases={useCases}
                      isBusiness={isBusiness}
                      onSelect={(val) => {
                        dispatch({
                          type: "SET_INTENT",
                          payload: val,
                        });
                        dispatch({
                          type: "SET_STEP",
                          payload: 3,
                        });
                      }}
                    />
                  )}
                  {intent === Intent.P2P && (
                    <>
                      {step === 3 && (
                        <OnboardingFirstDevice
                          firstDevice={firstDevice}
                          onFinish={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 4,
                            });
                          }}
                          onBack={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 2,
                            });
                          }}
                        />
                      )}
                      {step === 4 && (
                        <OnboardingSecondDevice
                          secondDevice={secondDevice}
                          onFinish={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 5,
                            });
                          }}
                        />
                      )}
                      {step === 5 && (
                        <OnboardingTestP2P
                          firstDevice={firstDevice}
                          secondDevice={secondDevice}
                          onTroubleshootingClick={() =>
                            onTroubleshootingClick?.(intent)
                          }
                          onNext={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 6,
                            });
                          }}
                        />
                      )}
                      {step === 6 && (
                        <OnboardingExplainDefaultPolicy
                          policy={policy}
                          onToggle={togglePolicy}
                          onNext={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 7,
                            });
                          }}
                        />
                      )}
                    </>
                  )}
                  {intent === Intent.NETWORKS && (
                    <>
                      {step === 3 && (
                        <OnboardingAddResource
                          onResourceCreation={(res) => {
                            setResource(res);
                            dispatch({
                              type: "SET_STEP",
                              payload: 4,
                            });
                            mutate("/networks");
                          }}
                          onBack={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 2,
                            });
                          }}
                        />
                      )}
                      {step === 4 && (
                        <OnboardingAddRoutingPeer
                          network={firstNetwork}
                          peers={peers}
                          onRoutingPeerAdded={(p) => {
                            setFirstRoutingPeer(p);
                            dispatch({
                              type: "SET_STEP",
                              payload: 5,
                            });
                          }}
                        />
                      )}
                      {step === 5 && (
                        <OnboardingAddUserDevice
                          device={firstDevice}
                          policy={policy}
                          onNext={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 6,
                            });
                          }}
                        />
                      )}
                      {step === 6 && (
                        <OnboardingTestResource
                          resource={resource}
                          device={firstDevice}
                          onTroubleshootingClick={() =>
                            onTroubleshootingClick?.(intent)
                          }
                          onNext={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 7,
                            });
                          }}
                        />
                      )}
                      {step === 7 && (
                        <OnboardingExplainPolicy
                          policy={policy}
                          onToggle={togglePolicy}
                          onNext={() => {
                            dispatch({
                              type: "SET_STEP",
                              payload: 8,
                            });
                            disableDefaultPolicy().then();
                          }}
                        />
                      )}
                    </>
                  )}
                  {step === maxSteps && (
                    <OnboardingEnd
                      onFinish={() => {
                        dispatch({
                          type: "SET_FINISHED_AT",
                          payload: new Date().toISOString(),
                        });

                        if (intent === Intent.NETWORKS) {
                          onFinish(firstNetwork);
                        } else {
                          onFinish();
                        }
                      }}
                    />
                  )}
                </Card>

                {showWaitingForDevices && (
                  <Card className={"md:col-span-5 lg:col-span-6"}>
                    <OnboardingDevices
                      intent={intent}
                      resource={resource}
                      firstDevice={firstDevice}
                      secondDevice={secondDevice}
                      firstRoutingPeer={firstRoutingPeer}
                      enabled={policy?.enabled}
                    />
                  </Card>
                )}
              </div>

              {step !== 1 && step !== maxSteps && (
                <span
                  className={
                    "text-sm text-nb-gray-400 font-light pb-10 text-center px-4"
                  }
                >
                  Already know how NetBird works?
                  <InlineLink
                    href={"#"}
                    className={"!text-nb-gray-200 ml-1"}
                    onClick={() => {
                      dispatch({
                        type: "SKIP",
                      });
                      onSkip(intent, step);
                    }}
                  >
                    Skip to Dashboard
                  </InlineLink>
                </span>
              )}
            </div>
          </div>
        </DialogContent>
      </ModalPortal>
    </Modal>
  );
};

const Stepper = ({ step, maxSteps }: { step: number; maxSteps: number }) => {
  if (step <= 0) return;

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
        "bg-nb-gray-940 border border-nb-gray-910  rounded-lg   relative",
        className,
      )}
    >
      <GradientFadedBackground className={"opacity-0"} />
      {children}
    </div>
  );
};
