import React from "react";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { TabsContent } from "@components/Tabs";
import { GlobeIcon } from "lucide-react";
import { AuthenticationSettings } from "@/cloud/webhooks/WebhookAuthenticationSettings";
import { WebhookConfig } from "@/cloud/webhooks/useWebhookConfig";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  value: WebhookConfig;
  urlHelpText?: string;
  mask?: boolean;
};

export function WebhookGeneralTabContent({
  value,
  urlHelpText = "Full HTTP(S) URL where events will be sent via a POST request.",
  mask,
}: Readonly<Props>) {
  const t = useTranslations();
  return (
    <TabsContent value={"general"} className={"px-8 text-sm"}>
      <div className={"mb-6"}>
        <Label>
          {value.isEditing
            ? t("webhooks.endpointUrl")
            : t("webhooks.enterEndpointUrl")}
        </Label>
        <HelpText>{urlHelpText}</HelpText>
        <Input
          customPrefix={<GlobeIcon size={16} />}
          placeholder={t("webhooks.httpsApiExampleComWebhook")}
          maxWidthClass="w-full"
          value={value.url}
          error={value.urlError}
          onChange={(e) => value.setUrl(e.target.value)}
          data-testid="webhook-url-input"
        />
      </div>

      <Label>{t("common.authentication")}</Label>
      <HelpText>{t("webhooks.authHelpText")}</HelpText>
      <AuthenticationSettings value={value} mask={mask} />
    </TabsContent>
  );
}
