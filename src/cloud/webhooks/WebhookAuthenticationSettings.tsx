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

export const authenticationOptions = [
  {
    value: AuthType.None,
    label: "No Authentication",
    icon: () => <CircleOffIcon size={14} />,
  },
  {
    value: AuthType.Basic,
    label: "Basic Auth",
    icon: () => <CircleUserIcon size={14} />,
  },
  {
    value: AuthType.Bearer,
    label: "Bearer Token",
    icon: () => <KeyRoundIcon size={14} />,
  },
  {
    value: AuthType.Custom,
    label: "Custom Authentication",
    icon: () => <BracesIcon size={14} />,
  },
] as SelectOption[];

type AuthenticationSettingsProps = {
  value: WebhookConfig;
  mask?: boolean;
};

export const AuthenticationSettings = ({
  value,
  mask,
}: AuthenticationSettingsProps) => (
  <>
    <SelectDropdown
      value={value.authenticationType}
      onChange={value.setAuthenticationType}
      options={authenticationOptions}
      data-testid="webhook-auth-type"
    />
    {value.authenticationType === AuthType.Basic && (
      <div className={"flex flex-col gap-2 mt-3"}>
        <Input
          customPrefix={<UserIcon size={16} />}
          placeholder="Username"
          value={value.username}
          onChange={(e) => value.setUsername(e.target.value)}
          data-testid="webhook-basic-username"
        />
        <Input
          customPrefix={<KeyRoundIcon size={16} />}
          placeholder="Password"
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
            <Label>HTTP Header Name & Value</Label>
            <HelpText>
              Specify the header name and value for your custom authentication
            </HelpText>
          </div>
          <div className={"flex flex-col gap-2"}>
            <Input
              customPrefix={<TagIcon size={16} />}
              placeholder="e.g. X-API-Key"
              value={value.customAuthName}
              onChange={(e) => value.setCustomAuthName(e.target.value)}
              data-testid="webhook-custom-auth-name"
            />
            <Input
              customPrefix={<KeyRoundIcon size={16} />}
              placeholder="e.g. AIiaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
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
