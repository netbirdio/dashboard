import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { cn, validator } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  ExternalLinkIcon,
  GlobeIcon,
  PlusCircle,
  Repeat,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import slackImage from "@/assets/integrations/slack.png";
import { NotificationWebhookChannel as SlackTarget } from "@/interfaces/NotificationChannel";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (target: SlackTarget) => void;
};

export default function NotificationSlackModal({
  open,
  onOpenChange,
  onSave,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <SlackModalContent
          onSave={(target) => {
            onSave(target);
            onOpenChange(false);
          }}
        />
      )}
    </Modal>
  );
}

type ModalContentProps = {
  onSave: (target: SlackTarget) => void;
};

function SlackModalContent({ onSave }: Readonly<ModalContentProps>) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");

  const urlError = useMemo(() => {
    if (url === "") return "";
    if (!validator.isValidUrl(url)) {
      return "Please enter a valid url, e.g., https://hooks.slack.com/services/...";
    }
    return "";
  }, [url]);

  const canConnect = !isEmpty(url) && urlError === "";

  const handleConnect = () => {
    onSave({ url });
  };

  const maxSteps = 2;

  return (
    <ModalContent
      maxWidthClass={cn("relative", "max-w-xl")}
      showClose={true}
      onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
      onInteractOutside={(e) => step > 0 && e.preventDefault()}
      onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
    >
      <GradientFadedBackground />

      <div className={"flex gap-2 w-full items-center justify-center mb-4"}>
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

      <IntegrationModalHeader
        image={slackImage}
        title={"Connect NetBird with Slack"}
        description={
          "Receive NetBird notification events directly in your Slack channel via an Incoming Webhook."
        }
      />

      {step === 0 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 mb-3"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <PlusCircle size={18} />
            Create a Slack App
          </p>

          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Open{" "}
                <InlineLink
                  href={"https://api.slack.com/apps?new_app=1"}
                  target={"_blank"}
                >
                  Slack App Management
                  <ExternalLinkIcon size={12} />
                </InlineLink>{" "}
                click <Mark>Create an app</Mark> <br />
                and choose <Mark>From scratch</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Set the app name to{" "}
                <Mark copy={true}>NetBird Notifications</Mark> and select your
                workspace. After that click <Mark>Create App</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step === 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={18} />
            Configure Incoming Webhook
          </p>

          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                In the app settings, go to <Mark>Incoming Webhooks</Mark> and
                toggle <Mark>Activate Incoming Webhooks</Mark> to <Mark>On</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Add New Webhook</Mark> and select the channel where
                you want to receive notifications and confirm with{" "}
                <Mark>Allow</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Copy the generated <Mark>Webhook URL</Mark> and paste it below.
              </p>
            </Steps.Step>
          </Steps>

          <div className={"mb-4"}>
            <Input
              autoFocus={true}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <GlobeIcon size={14} />
                </div>
              }
              placeholder={"https://hooks.slack.com/services/T000/B000/XXXX"}
              value={url}
              error={urlError}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="slack-webhook-url-input"
            />
          </div>
        </div>
      )}

      <ModalFooter className={"items-center gap-4"}>
        {step === 0 && (
          <ModalClose asChild={true}>
            <Button variant={"secondary"} className={"w-full"}>
              Cancel
            </Button>
          </ModalClose>
        )}
        {step > 0 && (
          <Button
            variant={"secondary"}
            className={"w-full"}
            onClick={() => setStep(step - 1)}
          >
            <IconArrowLeft size={16} />
            Back
          </Button>
        )}
        {step < maxSteps - 1 && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => setStep(step + 1)}
            data-testid="slack-continue"
          >
            Continue
            <IconArrowRight size={16} />
          </Button>
        )}
        {step === maxSteps - 1 && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!canConnect}
            onClick={handleConnect}
            data-testid="slack-connect"
          >
            <Repeat size={16} />
            Connect
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
}
