import { useTranslations } from "next-intl";
import React from "react";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { TabsContent } from "@components/Tabs";
import { GlobeIcon } from "lucide-react";
import { AuthenticationSettings } from "@/cloud/webhooks/WebhookAuthenticationSettings";
import { WebhookConfig } from "@/cloud/webhooks/useWebhookConfig";

type Props = {
  value: WebhookConfig;
  urlHelpText?: string;
  mask?: boolean;
};

export function WebhookGeneralTabContent({
  value,
  urlHelpText,
  mask,
}: Readonly<Props>) {
  const t = useTranslations("webhooks");
  return (
    <TabsContent value={"general"} className={"px-8 text-sm"}>
      <div className={"mb-6"}>
        <Label>
          {value.isEditing ? t("endpointUrl") : t("enterEndpointUrl")}
        </Label>
        <HelpText>{urlHelpText || t("authHelpText")}</HelpText>
        <Input
          customPrefix={<GlobeIcon size={16} />}
          placeholder={t("urlPlaceholder")}
          maxWidthClass="w-full"
          value={value.url}
          error={value.urlError}
          onChange={(e) => value.setUrl(e.target.value)}
          data-testid="webhook-url-input"
        />
      </div>

      <Label>{t("authentication")}</Label>
      <HelpText>
        {t("authHelpText")}
      </HelpText>
      <AuthenticationSettings value={value} mask={mask} />
    </TabsContent>
  );
}
