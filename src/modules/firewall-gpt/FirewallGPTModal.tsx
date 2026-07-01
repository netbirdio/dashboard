import { Modal, ModalContent } from "@components/modal/Modal";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import { isEmpty } from "lodash";
import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { useGroups } from "@/contexts/GroupsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  FirewallGPTRequest,
  FirewallGPTResponse,
  OperationType,
  PromptResult,
} from "@/interfaces/FirewallGPT";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import FirewallGPTChatInput from "@/modules/firewall-gpt/FirewallGPTChatInput";
import FirewallGptExampleCards from "@/modules/firewall-gpt/FirewallGPTExampleCards";
import { FirewallGPTFakeLoader } from "@/modules/firewall-gpt/FirewallGPTFakeLoader";
import { FirewallGptHeader } from "@/modules/firewall-gpt/FirewallGPTHeader";
import { FirewallGptMessage } from "@/modules/firewall-gpt/FirewallGptMessage";
import { FirewallGptPolicyPreview } from "@/modules/firewall-gpt/FirewallGPTPolicyPreview";
import { FirewallGPTSuccessModal } from "@/modules/firewall-gpt/FirewallGPTSuccessModal";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

type FirewallGPTProps = {
  onSuccess?: (policy: Policy, request_id: string) => void;
};

type MessageType = {
  id?: string;
  msg: string;
  isUser?: boolean;
  isLoading?: boolean;
};

const animationVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.5,
    },
  },
};

export const FirewallGPTModal = ({ open = false, setOpen }: Props) => {
  const { reset } = useGroups();

  const onOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) reset();
  };

  const [successRequestID, setSuccessRequestID] = useState<string>("");
  const [successPolicy, setSuccessPolicy] = useState<Policy>();
  const [successModal, setSuccessModal] = useState(false);
  const { isOwnerOrAdmin } = useLoggedInUser();

  return (
    isOwnerOrAdmin && (
      <>
        <Modal open={open} onOpenChange={onOpenChange} key={open ? "1" : "0"}>
          {open && (
            <FirewallGPTModalContent
              onSuccess={(policy, request_id) => {
                onOpenChange(false);
                setSuccessRequestID(request_id);
                setSuccessModal(true);
                setSuccessPolicy(policy);
              }}
            />
          )}
        </Modal>
        {successRequestID !== "" && (
          <FirewallGPTSuccessModal
            request_id={successRequestID}
            policy={successPolicy}
            open={successModal}
            setOpen={setSuccessModal}
          />
        )}
      </>
    )
  );
};

const FirewallGPTModalContent = ({ onSuccess }: FirewallGPTProps) => {
  const { loggedInUser: user } = useLoggedInUser();
  const { reset: resetGroups } = useGroups();
  const isPostureChecksLocked = useIsFeatureLocked("POSTURE_CHECKS");

  const firewallGPTRequest = useApiCall<FirewallGPTRequest>(
    "/integrations/assistant",
    true,
  );

  const [promptResults, setPromptResults] = useState<
    PromptResult[] | undefined
  >(undefined);

  const policyResult = useMemo(() => {
    if (!promptResults) return undefined;
    const prompt = promptResults.find(
      (result) => result.operation === OperationType.CREATE_POLICY,
    );
    if (prompt) {
      return prompt.body as Policy;
    }
    return undefined;
  }, [promptResults]);

  const postureCheckResult = useMemo(() => {
    if (isPostureChecksLocked) return undefined;
    if (!promptResults) return undefined;
    const prompt = promptResults.find(
      (result) =>
        result.operation === OperationType.CREATE_POSTURE_CHECK ||
        result.operation === OperationType.USE_POSTURE_CHECK,
    );
    if (prompt) {
      return prompt.body as PostureCheck;
    }
    return undefined;
  }, [promptResults, isPostureChecksLocked]);

  const sourceGroupsToBeCreated = useMemo(() => {
    if (!promptResults) return undefined;
    const prompts = promptResults.filter(
      (result) =>
        result.operation === OperationType.CREATE_GROUP &&
        result.used_as === "source_group",
    );
    if (prompts) {
      return prompts.map((prompt) => prompt.body as Group);
    }
    return undefined;
  }, [promptResults]);

  const destinationGroupsToBeCreated = useMemo(() => {
    if (!promptResults) return undefined;
    const prompts = promptResults.filter(
      (result) =>
        result.operation === OperationType.CREATE_GROUP &&
        result.used_as === "destination_group",
    );
    if (prompts) {
      return prompts.map((prompt) => prompt.body as Group);
    }
    return undefined;
  }, [promptResults]);

  const [requestID, setRequestID] = useState<string>(); // GPT Request ID
  const [isLoading, setIsLoading] = useState<undefined | boolean>(undefined); // Request loading state
  const [isFakeLoading, setIsFakeLoading] = useState<undefined | boolean>(
    undefined,
  );

  const [error, setError] = useState<{
    code: number;
    message: string;
  }>(); // GPT API error

  const [allMessages, setAllMessages] = useState<MessageType[]>([]); // All messages in chat

  // Ref used for focus input
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // User name for greeting
  const userName = useMemo(() => {
    return user?.name?.split(" ")[0] ?? user?.name ?? "there";
  }, [user]);

  const addMessage = (m: MessageType) => {
    if (isEmpty(m.msg)) return;
    setAllMessages((prev) => [...prev, m]);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const startNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("New chat started");
    }
    resetGroups();
    setAllMessages([]);
    setPromptResults(undefined);
    setRequestID(undefined);
    setError(undefined);
    setIsLoading(false);
    setIsFakeLoading(false);
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  };

  // Dispatch event to update chat input value
  const updateChatInputValue = (newValue: string) => {
    const event = new CustomEvent("setChatInput", { detail: newValue });
    window.dispatchEvent(event);
  };

  const send = async (currentPrompt: string) => {
    if (currentPrompt.length < 3) return;

    updateChatInputValue("");
    addMessage({
      msg: currentPrompt,
      isUser: true,
      isLoading: false,
    });
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    const startFakeLoading = setTimeout(() => {
      setError(undefined);
      setIsFakeLoading(true);
    }, 1500);

    firewallGPTRequest
      .post({ prompt: currentPrompt }, "", {
        signal: abortControllerRef.current?.signal,
      })
      .then((response) => {
        setError(undefined);
        let r = response as unknown as FirewallGPTResponse;
        if (r.clarifying_questions && r.clarifying_questions.length >= 1) {
          try {
            addMessage({
              msg: r.clarifying_questions[0],
              isUser: false,
              isLoading: false,
            });
          } catch (error) {
            console.error(error);
          }
        } else {
          setPromptResults(r.prompt_result);
          setRequestID(r.request_id);
        }
      })
      .catch((error) => {
        if (!error) return;
        if (error?.message) setError(error);
      })
      .finally(() => {
        setIsLoading(false);
        setIsFakeLoading(false);
        clearTimeout(startFakeLoading);
        setTimeout(() => {
          textAreaRef.current?.focus();
        }, 300);
      });
  };

  return (
    <ModalContent
      maxWidthClass={cn("relative", policyResult ? "max-w-3xl" : "max-w-3xl")}
      showClose={false}
      className={"pt-4 pb-0 focus:outline-0"}
    >
      <GradientFadedBackground />
      <FirewallGptHeader
        onNewChatClick={startNewChat}
        showNewChatButton={allMessages.length > 0}
      />

      <div className={"relative overflow-hidden"}>
        <motion.div
          className={"px-6 py-4 flex flex-col gap-6 relative z-10 mt-3 mb-2"}
          animate={"visible"}
          initial={"hidden"}
          variants={animationVariants}
          transition={{
            staggerChildren: 0.5,
          }}
        >
          {/* Hello Message */}
          <FirewallGptMessage
            isLoading={false}
            messages={[
              {
                msg: `Hello ${userName}, I'm here to help you configure your access control rules securely and efficiently. How can I assist you today?`,
              },
            ]}
          />

          {allMessages.map((message, index) => (
            <FirewallGptMessage
              key={`${message.msg}-${index}`}
              messages={[
                {
                  msg: message.msg,
                },
              ]}
              isUser={message.isUser}
              isLoading={message.isLoading}
            />
          ))}

          {/* Fake loader if request takes too long */}
          {isFakeLoading === true && <FirewallGPTFakeLoader />}

          {/* Policy Response after success */}
          {isLoading === false && policyResult && (
            <FirewallGptPolicyPreview
              onSuccess={(p) => {
                if (!requestID) return;
                startNewChat();
                onSuccess?.(p, requestID);
              }}
              policy={policyResult}
              initialPostureCheck={postureCheckResult}
              sourceGroupsToBeCreated={sourceGroupsToBeCreated}
              destinationGroupsToBeCreated={destinationGroupsToBeCreated}
            />
          )}
        </motion.div>

        {/* Example Cards (shown only when no user prompt is set) */}
        {allMessages.length == 0 && (
          <FirewallGptExampleCards
            onClick={(p) => updateChatInputValue(p)}
            textAreaRef={textAreaRef}
          />
        )}

        {/* API Errors */}
        {error && (
          <div className={"px-6 mt-5"}>
            <div
              className={
                "text-sm text-red-500 bg-red-900/30 border border-red-500/30 rounded-md px-3 py-2"
              }
              title={
                capitalizeFirstLetter(error.message) +
                " (Code: " +
                error.code +
                ")"
              }
            >
              {capitalizeFirstLetter(error.message)}
            </div>
          </div>
        )}

        {/* Smart Firewall Chat Input */}
        {policyResult === undefined && (
          <FirewallGPTChatInput
            onSend={(v) => send(v)}
            ref={textAreaRef}
            isLoading={isLoading}
          />
        )}
      </div>
    </ModalContent>
  );
};

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
