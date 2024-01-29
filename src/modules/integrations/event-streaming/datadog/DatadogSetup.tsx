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
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  Globe,
  GlobeIcon,
  KeyRound,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import datadogLogo from "@/assets/integrations/datadog.png";
import { EventStream } from "@/interfaces/EventStream";
import {
  DatadogApiKeysPage,
  DatadogRegions,
} from "@/modules/integrations/event-streaming/datadog/DatadogRegions";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function DatadogSetup({ open, onOpenChange, onSuccess }: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <SetupContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
        />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
};

export function SetupContent({ onSuccess }: ModalProps) {
  const { mutate } = useSWRConfig();

  const integrationRequest = useApiCall<EventStream>(
    "/integrations/event-streaming",
  );

  const datadogRegions = DatadogRegions.map((region) => {
    return {
      label: region.name,
      value: region.send_logs_url,
      icon: region.icon,
    } as SelectOption;
  });

  const [selectedRegion, setSelectedRegion] = useState(datadogRegions[0].value);

  const changeRegion = (region: string) => {
    setSelectedRegion(region);
    setApiUrl(region);
  };

  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState(datadogRegions[0].value);
  const [step, setStep] = useState(1);

  const apiKeyEntered = apiKey.length > 0 && apiKey != "";
  const apiUrlEntered = apiUrl.length > 0 && apiUrl != "";
  const apiKeyAndUrlEntered = apiKeyEntered && apiUrlEntered;

  const apiPageUrl =
    DatadogRegions.find((region) => region.send_logs_url == apiUrl)?.site_url +
    DatadogApiKeysPage;

  const connect = async () => {
    notify({
      title: "Datadog Integration",
      description: `Datadog was successfully connected to NetBird.`,
      promise: integrationRequest
        .post({
          platform: "datadog",
          config: {
            api_key: apiKey,
            api_url: apiUrl,
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
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={datadogLogo}
        title={"Connect NetBird with Datadog"}
        description={
          "Start streaming your NetBird activity events to Datadog. Follow the steps below to get started."
        }
      />

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={16} />
            Select your Datadog region
          </p>
          <p className={"mb-3 mt-2"}>
            To identify which region you are on please check out the{" "}
            <InlineLink
              href={"https://docs.datadoghq.com/getting_started/site/"}
              target={"_blank"}
              variant={"default"}
              className={"inline"}
            >
              Datadog Documentation.
            </InlineLink>
          </p>
          <SelectDropdown
            value={selectedRegion}
            onChange={changeRegion}
            options={datadogRegions}
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
              placeholder={"https://http-intake.logs.datadoghq.eu/api/v2/logs"}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className={"mb-3"}></div>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={16} />
            Get your Datadog API Key
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>Navigate to Datadogs API Keys page</p>
              <div className={"flex gap-4"}>
                <Link href={apiPageUrl} passHref target={"_blank"}>
                  <Button variant={"primary"} size={"xs"}>
                    <ExternalLinkIcon size={14} />
                    API Keys
                  </Button>
                </Link>
              </div>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click{" "}
                <div
                  className={
                    "inline-flex bg-nb-gray-900 py-1.5 px-2.5 rounded-md text-xs items-center mx-0.5"
                  }
                >
                  + New Key
                </div>{" "}
                at the top
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Give it a descriptive name like{" "}
                <div
                  className={
                    "inline-flex bg-nb-gray-900 py-1.5 px-2.5 rounded-md text-xs items-center mx-0.5"
                  }
                >
                  NetBird Activity Events
                </div>
                and click{" "}
                <div
                  className={
                    "inline-flex bg-nb-gray-900 py-1.5 px-2.5 rounded-md text-xs items-center mx-0.5"
                  }
                >
                  Create Key
                </div>
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>Enter your API-Key</p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <KeyRound size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={"1c17401cf170f7ac33dd9dcdf8040eb2"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
      )}

      <ModalFooter className={"items-center gap-4"}>
        {step == 1 && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!apiUrlEntered}
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
              disabled={!apiKeyAndUrlEntered}
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
