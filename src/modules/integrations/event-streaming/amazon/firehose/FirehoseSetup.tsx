import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  Globe,
  GlobeIcon,
  InfoIcon,
  KeyRound,
  PencilLine,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import firehoseLogo from "@/assets/integrations/firehose.png";
import { EventStream } from "@/interfaces/EventStream";
import { AmazonRegions } from "@/modules/integrations/event-streaming/amazon/AmazonRegions";
import {
  exampleAwsAccessKeyId,
  exampleAwsSecretAccessKey,
} from "@/modules/integrations/event-streaming/amazon/exampleCredentials";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function FirehoseSetup({
  open,
  onOpenChange,
  onSuccess,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <SetupContent
        onSuccess={() => {
          onOpenChange(false);
          onSuccess && onSuccess();
        }}
      />
    </Modal>
  );
}

type ModalProps = {
  onSuccess: () => void;
};

export function SetupContent({ onSuccess }: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();

  const integrationRequest = useApiCall<EventStream>(
    "/integrations/event-streaming",
    true,
  );

  const firehoseRegions = AmazonRegions.map((region) => {
    return {
      label: region.name,
      value: region.code,
      icon: region.icon,
    } as SelectOption;
  });

  const iamDashboardURL = "https://console.aws.amazon.com/iam/home";
  const iamDocsURL =
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html";
  const firehoseDashboardURL = "https://console.aws.amazon.com/firehose/home";

  const [selectedRegion, setSelectedRegion] = useState(
    firehoseRegions[0].value,
  );

  const changeRegion = (region: string) => {
    setSelectedRegion(region);
  };

  const [secretKey, setSecretKey] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const accessKeyPlaceholder = useMemo(exampleAwsAccessKeyId, []);
  const secretKeyPlaceholder = useMemo(exampleAwsSecretAccessKey, []);
  const [streamName, setStreamName] = useState("");
  const [region, setRegion] = useState(firehoseRegions[0].value);
  const [step, setStep] = useState(1);

  const secretKeyEntered = secretKey.length > 0 && secretKey != "";
  const accessKeyEntered = accessKey.length > 0 && accessKey != "";
  const streamNameEntered = streamName.length > 0 && streamName != "";
  const regionEntered = region.length > 0 && region != "";

  const dataEntered =
    secretKeyEntered && accessKeyEntered && streamNameEntered && regionEntered;

  const connect = async () => {
    notify({
      title: "Amazon Data Firehose Integration",
      description: `Amazon Data Firehose was successfully connected to NetBird.`,
      promise: integrationRequest
        .post({
          platform: "firehose",
          config: {
            access_key: accessKey,
            secret_key: secretKey,
            stream_name: streamName,
            region: selectedRegion,
          },
          enabled: true,
        })
        .then(() => {
          mutate("/integrations/event-streaming");
          onSuccess();
        }),
      loadingMessage: "Setting up integration...",
    });
  };

  return (
    <ModalContent
      maxWidthClass={cn("relative", step === 1 ? "max-w-md" : "max-w-lg")}
      showClose={true}
      onEscapeKeyDown={(e) => step > 1 && e.preventDefault()}
      onInteractOutside={(e) => step > 1 && e.preventDefault()}
      onPointerDownOutside={(e) => step > 1 && e.preventDefault()}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={firehoseLogo}
        title={"Connect NetBird with Amazon Data Firehose"}
        description={
          "Start streaming your NetBird audit & traffic events to Amazon Data Firehose. Follow the steps below to get started."
        }
      />

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={16} />
            Select your Amazon Data Firehose region
          </p>
          <p className={"mb-3 mt-2"}>
            To identify which region you are on please check out the{" "}
            <InlineLink
              href={firehoseDashboardURL}
              target={"_blank"}
              variant={"default"}
              className={"inline"}
            >
              Amazon Data Firehose Dashboard.
            </InlineLink>
          </p>
          <SelectDropdown
            value={selectedRegion}
            onChange={changeRegion}
            options={firehoseRegions}
            showValues={true}
          />
          <div className={"mt-3 hidden"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <Globe size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={"eu-central-1"}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          <div className={"mb-3"}></div>
        </div>
      )}
      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={16} />
            Create your Firehose Stream
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to the Amazon Data Firehose Stream Dashboard</p>
              <div className={"flex gap-4"}>
                <Link href={firehoseDashboardURL} passHref target={"_blank"}>
                  <Button variant={"primary"} size={"xs"}>
                    <ExternalLinkIcon size={14} />
                    Amazon Data Firehose Stream Dashboard
                  </Button>
                </Link>
              </div>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>Create Firehose stream</Mark> at the top right
                corner
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                As <Mark>Source</Mark>
                select <Mark>Direct PUT</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={4}>
              <p className={"font-normal"}>
                As <Mark>Destination</Mark>
                select the AWS service you want to push the events to
              </p>
            </Steps.Step>
            <Steps.Step step={5}>
              <p className={"font-normal"}>
                Give it a descriptive name like{" "}
                <Mark copy>netbird-activity-events</Mark>
                and click <Mark>Create Firehose stream</Mark>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon
                      size={16}
                      className={"inline-block ml-1 text-netbird"}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className={"max-w-[200px] text-xs"}>
                      {`You can transform and convert the event messages to fit your needs.`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
            </Steps.Step>
            <Steps.Step step={6} line={false}>
              <p className={"font-normal"}>Enter your Firehose stream name</p>
              <div className={"mb-4"}>
                <Input
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"flex items-center gap-2"}>
                      <PencilLine size={16} className={"text-nb-gray-300"} />
                    </div>
                  }
                  placeholder={"netbird-activity-events"}
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                />
              </div>
            </Steps.Step>
          </Steps>
        </div>
      )}
      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={16} />
            Create IAM credential
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to the Amazon IAM Dashboard</p>
              <div className={"flex gap-4"}>
                <Link href={iamDashboardURL} passHref target={"_blank"}>
                  <Button variant={"primary"} size={"xs"}>
                    <ExternalLinkIcon size={14} />
                    Amazon IAM Dashboard
                  </Button>
                </Link>
              </div>
            </Steps.Step>
            <Steps.Step step={2}>
              <p>
                Create an IAM User (for details see the{" "}
                <InlineLink href={iamDocsURL} target={"_blank"}>
                  Amazon Docs
                  <ExternalLinkIcon size={12} />
                </InlineLink>
                )
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Create and assign a policy with <Mark>firehose:PutRecord</Mark>
                and <Mark>firehose:PutRecordBatch</Mark>
                to the user and scope it to the created stream
              </p>
            </Steps.Step>
            <Steps.Step step={4}>
              <p className={"font-normal"}>
                Select the user and go to the <Mark>Security Credentials</Mark>
                tab and select <Mark>Create access key</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={5}>
              <p className={"font-normal"}>Enter your Access-Key</p>
              <div className={"mb-4"}>
                <Input
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"flex items-center gap-2"}>
                      <KeyRound size={16} className={"text-nb-gray-300"} />
                    </div>
                  }
                  placeholder={accessKeyPlaceholder}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                />
              </div>
            </Steps.Step>
            <Steps.Step step={6} line={false}>
              <p className={"font-normal"}>Enter your Secret-Key</p>
              <div className={"mb-4"}>
                <Input
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"flex items-center gap-2"}>
                      <KeyRound size={16} className={"text-nb-gray-300"} />
                    </div>
                  }
                  placeholder={secretKeyPlaceholder}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
            </Steps.Step>
          </Steps>
        </div>
      )}

      <ModalFooter className={"items-center gap-4"}>
        {step == 1 && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!regionEntered}
            onClick={() => setStep(2)}
          >
            Continue
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == 2 && (
          <>
            <Button
              variant={"secondary"}
              className={"w-full"}
              onClick={() => setStep(1)}
            >
              <IconArrowLeft size={16} />
              Back
            </Button>
            <Button
              variant={"primary"}
              className={"w-full"}
              disabled={!streamNameEntered}
              onClick={() => setStep(3)}
            >
              Continue
              <IconArrowRight size={16} />
            </Button>
          </>
        )}
        {step == 3 && (
          <>
            <Button
              variant={"secondary"}
              className={"w-full"}
              onClick={() => setStep(2)}
            >
              <IconArrowLeft size={16} />
              Back
            </Button>
            <Button
              variant={"primary"}
              className={"w-full"}
              disabled={!dataEntered}
              onClick={connect}
            >
              <Repeat size={16} />
              Connect
            </Button>
          </>
        )}
      </ModalFooter>
    </ModalContent>
  );
}
