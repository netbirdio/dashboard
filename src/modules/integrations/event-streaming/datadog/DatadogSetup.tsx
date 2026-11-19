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
  Repeat,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import datadogLogo from "@/assets/integrations/datadog.png";
import { useTranslations } from "@/i18n/LocaleProvider";
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

export default function DatadogSetup({
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
  const t = useTranslations();
  const { mutate } = useSWRConfig();

  const integrationRequest = useApiCall<EventStream>(
    "/integrations/event-streaming",
    true,
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
      title: t("integrations.edrIntegrationTitle", { name: "Datadog" }),
      description: t("integrations.streamingConnectedDescription", {
        name: "Datadog",
      }),
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
      loadingMessage: t("integrations.streamingSettingUpLoading"),
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
        image={datadogLogo}
        title={t("integrations.streamingConnectTitle", { name: "Datadog" })}
        description={t("integrations.streamingConnectDescription", {
          name: "Datadog",
        })}
      />

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col mt-4 z-0"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <GlobeIcon size={16} />
            {t("integrations.streamingSelectRegion", { name: "Datadog" })}
          </p>
          <p className={"mb-3 mt-2"}>
            {t.rich("integrations.streamingIdentifyRegion", {
              label: t("integrations.streamingDatadogDocumentation"),
              link: (chunks) => (
                <InlineLink
                  href={"https://docs.datadoghq.com/getting_started/site/"}
                  target={"_blank"}
                  variant={"default"}
                  className={"inline"}
                >
                  {chunks}
                </InlineLink>
              ),
            })}
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
            {t("integrations.streamingGetDatadogKey")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>{t("integrations.streamingNavigateDatadogKeys")}</p>
              <div className={"flex gap-4"}>
                <Link href={apiPageUrl} passHref target={"_blank"}>
                  <Button variant={"primary"} size={"xs"}>
                    <ExternalLinkIcon size={14} />
                    {t("integrations.streamingApiKeys")}
                  </Button>
                </Link>
              </div>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {t.rich("integrations.streamingClickNewKey", {
                  mark: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {t.rich("integrations.streamingNameDatadogKey", {
                  createKey: t("common.createKey"),
                  mark: (chunks) => <Mark copy>{chunks}</Mark>,
                })}
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon
                      size={15}
                      className={
                        "inline-block relative ml-1 -top-[1px] text-netbird hover:text-netbird-400"
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className={"max-w-[200px] text-xs"}>
                      {t("integrations.streamingDatadogKeyDelay")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                {t("integrations.streamingEnterApiKey")}
              </p>
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
            {t("common.continue")}
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
              {t("common.back")}
            </Button>
            <Button
              variant={"primary"}
              className={"w-full"}
              disabled={!apiKeyAndUrlEntered}
              onClick={connect}
            >
              <Repeat size={16} />
              {t("integrations.connect")}
            </Button>
          </>
        )}
      </ModalFooter>
    </ModalContent>
  );
}
