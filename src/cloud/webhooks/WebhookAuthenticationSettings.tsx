import { useTranslations } from "next-intl";
import React from "react";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  BracesIcon,
  CircleOffIcon,
  CircleUserIcon,
  KeyRoundIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import { WebhookConfig } from "@/cloud/webhooks/useWebhookConfig";

export enum AuthType {
  None = "none",
  Basic = "basic",
  Bearer = "bearer",
  Custom = "custom",
}

function getAuthenticationOptions(t: (key: string) => string): SelectOption[] {
  return [
    {
      value: AuthType.None,
      label: t("noAuthentication"),
      icon: () => <CircleOffIcon size={14} />,
    },
    {
      value: AuthType.Basic,
      label: t("basicAuth"),
      icon: () => <CircleUserIcon size={14} />,
    },
    {
      value: AuthType.Bearer,
      label: t("bearerToken"),
      icon: () => <KeyRoundIcon size={14} />,
    },
    {
      value: AuthType.Custom,
      label: t("customAuthentication"),
      icon: () => <BracesIcon size={14} />,
    },
  ];
}

type AuthenticationSettingsProps = {
  value: WebhookConfig;
  mask?: boolean;
};

export const AuthenticationSettings = ({
  value,
  mask,
}: AuthenticationSettingsProps) => {
  const t = useTranslations("webhooks");
  return (
    <>
      <SelectDropdown
        value={value.authenticationType}
        onChange={value.setAuthenticationType}
        options={getAuthenticationOptions(t)}
        data-testid="webhook-auth-type"
      />
      {value.authenticationType === AuthType.Basic && (
        <div className={"flex flex-col gap-2 mt-3"}>
          <Input
            customPrefix={<UserIcon size={16} />}
            placeholder={t("username")}
            value={value.username}
            onChange={(e) => value.setUsername(e.target.value)}
            data-testid="webhook-basic-username"
          />
          <Input
            customPrefix={<KeyRoundIcon size={16} />}
            placeholder={t("password")}
            value={value.password}
            onChange={(e) => value.setPassword(e.target.value)}
            type={mask ? "password" : "text"}
            data-testid="webhook-basic-password"
          />
        </div>
      )}

      {value.authenticationType === AuthType.Bearer && (
        <div className={"flex flex-col gap-2 mt-3"}>
          <Input
            customPrefix={"Bearer"}
            placeholder="e.g. eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InVURWw0SmJieUU4S00zY3NwcmdUSSJ9.eyJodHRwOi8vbG9jYWxob3N0OjMwMDA"
            value={value.bearerToken}
            onChange={(e) => value.setBearerToken(e.target.value)}
            type={mask ? "password" : "text"}
            data-testid="webhook-bearer-token"
          />
        </div>
      )}

      {value.authenticationType === AuthType.Custom && (
        <div className={"flex flex-col gap-6 mt-6"}>
          <div>
            <div>
              <Label>{t("httpHeaderNameValue")}</Label>
              <HelpText>
                {t("customAuthHelp")}
              </HelpText>
            </div>
            <div className={"flex flex-col gap-2"}>
              <Input
                customPrefix={<TagIcon size={16} />}
                placeholder={t("customAuthNamePlaceholder")}
                value={value.customAuthName}
                onChange={(e) => value.setCustomAuthName(e.target.value)}
                data-testid="webhook-custom-auth-name"
              />
              <Input
                customPrefix={<KeyRoundIcon size={16} />}
                placeholder={t("customAuthValuePlaceholder")}
                type={mask ? "password" : "text"}
                value={value.customAuthValue}
                onChange={(e) => value.setCustomAuthValue(e.target.value)}
                data-testid="webhook-custom-auth-value"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
