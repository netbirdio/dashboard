import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { SmallBadge } from "@components/ui/SmallBadge";
import { useExpirationState } from "@hooks/useExpirationState";
import { convertToSeconds } from "@hooks/useTimeFormatter";
import * as Tabs from "@radix-ui/react-tabs";
import { IconDevicesCheck } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import {
  CalendarClock,
  ExternalLinkIcon,
  KeyRound,
  ShieldUserIcon,
  TimerResetIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { AccountMFASettings } from "@/cloud/mfa/AccountMFASettings";
import {
  SignInDomainsSettings,
  useCanViewSignInDomains,
} from "@/cloud/sign-in-domains/SignInDomainsSettings";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Account } from "@/interfaces/Account";
import { LockedFeatureBadge } from "@/modules/billing/locked-feature/LockedFeatureBadge";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";

type Props = {
  account: Account;
};

export default function AuthenticationTab({ account }: Readonly<Props>) {
  const translate = useTranslations();
  const { permission } = usePermissions();
  const canViewSignInDomains = useCanViewSignInDomains();

  const { mutate } = useSWRConfig();

  // Check if any mdm & edr integration is enabled
  const { isAnyIntegrationEnabled, activeIntegrationName } = useIntegrations();

  /**
   * Peer approval enabled
   */
  const [peerApproval, setPeerApproval] = useState<boolean>(() => {
    try {
      return account?.settings?.extra?.peer_approval_enabled || false;
    } catch (error) {
      return false;
    }
  });

  /**
   * User approval required
   */
  const [userApprovalRequired, setUserApprovalRequired] = useState<boolean>(
    () => {
      try {
        return account?.settings?.extra?.user_approval_required || false;
      } catch (error) {
        return false;
      }
    },
  );

  // Local MFA (UI only, not wired to the backend yet)
  const [isLocalMFAEnabled, setIsLocalMFAEnabled] = useState<boolean>(() => {
    try {
      return account?.settings?.local_mfa_enabled || false;
    } catch (error) {
      return false;
    }
  });

  // Peer Expiration
  const [
    loginExpiration,
    setLoginExpiration,
    expiresIn,
    setExpiresIn,
    expireInterval,
    setExpireInterval,
  ] = useExpirationState({
    enabled: account.settings.peer_login_expiration_enabled,
    expirationInSeconds: account.settings.peer_login_expiration || 86400,
  });

  // Peer Inactivity Expiration
  const [
    peerInactivityExpirationEnabled,
    setPeerInactivityExpirationEnabled,
    peerInactivityExpiresIn,
    peerInactivityExpireInterval,
  ] = useExpirationState({
    enabled: account.settings.peer_inactivity_expiration_enabled,
    expirationInSeconds: account.settings.peer_inactivity_expiration || 600,
    timeRange: ["minutes", "hours", "days"],
  });

  /**
   * Save changes
   */
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const { hasChanges, updateRef } = useHasChanges([
    peerApproval,
    userApprovalRequired,
    loginExpiration,
    expiresIn,
    expireInterval,
    peerInactivityExpirationEnabled,
    peerInactivityExpiresIn,
    peerInactivityExpireInterval,
    isLocalMFAEnabled,
  ]);

  const saveChanges = async () => {
    const expiration = convertToSeconds(expiresIn, expireInterval);

    notify({
      title: translate("settings.authSaveTitle"),
      description: translate("settings.authSaved"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            peer_login_expiration_enabled: loginExpiration,
            peer_login_expiration: loginExpiration ? expiration : 86400,
            peer_inactivity_expiration_enabled: loginExpiration
              ? peerInactivityExpirationEnabled
              : false,
            peer_inactivity_expiration: 600,
            extra: {
              ...account.settings?.extra,
              peer_approval_enabled: isAnyIntegrationEnabled
                ? false
                : peerApproval,
              user_approval_required: userApprovalRequired,
            },
            local_mfa_enabled: isLocalMFAEnabled,
          },
        } as Account)
        .then(() => {
          mutate("/accounts");
          updateRef([
            peerApproval,
            userApprovalRequired,
            loginExpiration,
            expiresIn,
            expireInterval,
            peerInactivityExpirationEnabled,
            peerInactivityExpiresIn,
            peerInactivityExpireInterval,
            isLocalMFAEnabled,
          ]);
        }),
      loadingMessage: translate("settings.authSaving"),
    });
  };

  return (
    <Tabs.Content value={"authentication"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <div className={"flex items-start justify-between -mt-1"}>
          <div>
            <h1>{translate("common.authentication")}</h1>
            <Paragraph className={"block"}>
              {translate("settings.authDescription")}{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/enforce-periodic-user-authentication"
                }
                target={"_blank"}
              >
                {translate("common.learnMore")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>

          <Button
            variant={"primary"}
            disabled={!hasChanges || !permission.settings.update}
            onClick={saveChanges}
            data-testid={"save-authentication-settings"}
          >
            {translate("common.saveChanges")}
          </Button>
        </div>

        <div
          className={"flex flex-col gap-6 w-full mt-8 mb-3"}
          data-auth-setting={"toggles"}
        >
          <FullTooltip
            content={
              <div className={"text-xs max-w-sm"}>
                {translate("settings.peerApprovalIntegration", {
                  name: activeIntegrationName ?? "",
                })}
              </div>
            }
            disabled={!isAnyIntegrationEnabled}
          >
            <div className={"w-full"} data-auth-setting={"peer-approval"}>
              <LockedFeatureBadge
                featureText={translate("settings.peerApprovalFeature")}
                feature={"DEVICE_APPROVALS"}
                disabled={peerApproval}
              >
                <FancyToggleSwitch
                  value={peerApproval}
                  onChange={setPeerApproval}
                  data-testid={"peer-approval"}
                  label={
                    <>
                      <IconDevicesCheck size={15} />
                      {translate("common.peerApproval")}
                    </>
                  }
                  disabled={
                    isAnyIntegrationEnabled || !permission.settings.update
                  }
                  helpText={translate("settings.peerApprovalHelp")}
                />
              </LockedFeatureBadge>
            </div>
          </FullTooltip>

          <div className={"flex flex-col"}>
            <FancyToggleSwitch
              value={userApprovalRequired}
              onChange={setUserApprovalRequired}
              data-testid={"user-approval-required"}
              label={
                <>
                  <ShieldUserIcon size={15} />
                  {translate("settings.userApprovalRequired")}
                </>
              }
              helpText={
                <>
                  {translate.rich("settings.userApprovalHelp", {
                    br: () => <br />,
                  })}
                </>
              }
              disabled={!permission.settings.update}
            />
          </div>

          {!account.settings.local_auth_disabled &&
          account.settings.embedded_idp_enabled ? (
            <div className={"flex flex-col"}>
              <FancyToggleSwitch
                value={isLocalMFAEnabled}
                onChange={setIsLocalMFAEnabled}
                data-testid={"local-mfa-enabled"}
                label={
                  <>
                    <KeyRound size={15} />
                    {translate("settings.enableLocalMFA")}
                    <SmallBadge
                      text={translate("common.beta")}
                      variant={"sky"}
                      className={"text-[9px] leading-none py-[3px] px-[5px]"}
                      textClassName={"top-0"}
                    />
                  </>
                }
                helpText={
                  <>
                    {translate.rich("settings.localMfaHelp", {
                      br: () => <br />,
                    })}
                  </>
                }
                disabled={!permission.settings.update}
              />
            </div>
          ) : null}

          <div
            className={"flex flex-col"}
            data-auth-setting={"peer-session-expiration"}
          >
            <FancyToggleSwitch
              value={loginExpiration}
              onChange={(state) => {
                setLoginExpiration(state);
                !state && setPeerInactivityExpirationEnabled(false);
              }}
              data-testid={"peer-login-expiration"}
              label={
                <>
                  <TimerResetIcon size={15} />
                  {translate("settings.peerSessionExpiration")}
                </>
              }
              helpText={
                <>
                  {translate.rich("settings.peerReauthHelp", {
                    br: () => <br />,
                  })}
                </>
              }
              disabled={!permission.settings.update}
            />

            <div
              className={cn(
                "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                !loginExpiration || !permission.settings.update
                  ? "opacity-50 pointer-events-none"
                  : "bg-nb-gray-930/80",
              )}
            >
              <div className={cn("flex justify-between gap-10 mt-2")}>
                <div className={"w-full"}>
                  <Label>{translate("settings.sessionExpiration")}</Label>
                  <HelpText>
                    {translate("settings.sessionExpirationHelp")}
                  </HelpText>
                </div>
                <div className={"w-full flex gap-3"}>
                  <Input
                    placeholder={"7"}
                    maxWidthClass={"min-w-[100px]"}
                    min={1}
                    disabled={!loginExpiration || !permission.settings.update}
                    data-testid={"peer-login-expiration-input"}
                    max={180}
                    className={"w-full"}
                    value={expiresIn}
                    type={"number"}
                    onChange={(e) => setExpiresIn(e.target.value)}
                  />
                  <Select
                    disabled={!loginExpiration || !permission.settings.update}
                    value={expireInterval}
                    onValueChange={(v) => setExpireInterval(v)}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-testid={"peer-login-expiration-select"}
                    >
                      <div className={"flex items-center gap-3"}>
                        <CalendarClock
                          size={15}
                          className={"text-nb-gray-300"}
                        />
                        <SelectValue
                          placeholder={translate("settings.selectInterval")}
                          data-testid={"peer-login-expiration-select-value"}
                        />
                      </div>
                    </SelectTrigger>
                    <SelectContent
                      data-testid={"peer-login-expiration-select-content"}
                    >
                      <SelectItem value="days">
                        {translate("settings.days")}
                      </SelectItem>
                      <SelectItem value="hours">
                        {translate("settings.hours")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FancyToggleSwitch
                variant={"blank"}
                value={peerInactivityExpirationEnabled}
                onChange={setPeerInactivityExpirationEnabled}
                data-testid={"peer-inactivity-expiration"}
                label={<>{translate("settings.requireLoginAfterDisconnect")}</>}
                disabled={!permission.settings.update}
                helpText={<>{translate("settings.requireLoginHelp")}</>}
              />
            </div>
          </div>
        </div>
      </div>

      {isNetBirdCloud() && (
        <>
          <Separator />
          <div className={"p-default py-8 pb-0 max-w-2xl"}>
            <div className={"max-w-6xl"}>
              <AccountMFASettings />
            </div>
          </div>
        </>
      )}

      {canViewSignInDomains && (
        <>
          <Separator />
          <div className={"p-default py-8 max-w-2xl"}>
            <div className={"max-w-6xl"}>
              <SignInDomainsSettings />
            </div>
          </div>
        </>
      )}
    </Tabs.Content>
  );
}
