import { useTranslations } from "next-intl";
import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { SmallBadge } from "@components/ui/SmallBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { useExpirationState } from "@hooks/useExpirationState";
import { convertToSeconds } from "@hooks/useTimeFormatter";
import * as Tabs from "@radix-ui/react-tabs";
import { IconDevicesCheck } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  CalendarClock,
  ExternalLinkIcon,
  KeyRound,
  ShieldIcon,
  ShieldUserIcon,
  TimerResetIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { AccountMFASettings } from "@/cloud/mfa/AccountMFASettings";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Account } from "@/interfaces/Account";
import { LockedFeatureBadge } from "@/modules/billing/locked-feature/LockedFeatureBadge";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { isNetBirdCloud } from "@utils/netbird";

type Props = {
  account: Account;
};

export default function AuthenticationTab({ account }: Readonly<Props>) {
  const t = useTranslations("settings");
  const { permission } = usePermissions();

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
      title: "Save Authentication Settings",
      description: "Authentication settings successfully saved.",
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
      loadingMessage: "Saving the authentication settings...",
    });
  };

  return (
    <Tabs.Content value={"authentication"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Authentication"}
            icon={<ShieldIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>Authentication</h1>
            <Paragraph>
              Learn more about
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/enforce-periodic-user-authentication"
                }
                target={"_blank"}
              >
                Authentication
                <ExternalLinkIcon size={12} />
              </InlineLink>
              or{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/multi-factor-authentication"
                }
                target={"_blank"}
              >
                MFA
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
            Save Changes
          </Button>
        </div>

        <div
          className={"flex flex-col gap-6 w-full mt-8 mb-3"}
          data-auth-setting={"toggles"}
        >
          <FullTooltip
            content={
              <div className={"text-xs max-w-sm"}>
                Peer approval is disabled because the {activeIntegrationName}{" "}
                integration is enabled. If you want to enable peer approval,
                please disable first the {activeIntegrationName} integration.
              </div>
            }
            disabled={!isAnyIntegrationEnabled}
          >
            <div className={"w-full"} data-auth-setting={"peer-approval"}>
              <LockedFeatureBadge
                featureText={"Peer approval"}
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
                      Peer Approval
                    </>
                  }
                  disabled={
                    isAnyIntegrationEnabled || !permission.settings.update
                  }
                  helpText={"Require peers to be approved by an administrator."}
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
                  User Approval Required
                </>
              }
              helpText={
                <>
                  Require manual approval for new users joining via <br />
                  domain matching. Users will be blocked until approved.
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
                    Enable Local MFA
                    <SmallBadge
                      text={"Beta"}
                      variant={"sky"}
                      className={"text-[9px] leading-none py-[3px] px-[5px]"}
                      textClassName={"top-0"}
                    />
                  </>
                }
                helpText={
                  <>
                    Require multi-factor authentication for users
                    <br />
                    authenticating with local credentials.
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
                  {t("peerSessionExpiration")}
                </>
              }
              helpText={
                <>
                {t("peerSessionExpirationHelp")}
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
                  <Label>{t("sessionExpiration")}</Label>
                  <HelpText>
                    {t("sessionExpirationHelp")}
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
                          placeholder="Select interval..."
                          data-testid={"peer-login-expiration-select-value"}
                        />
                      </div>
                    </SelectTrigger>
                    <SelectContent
                      data-testid={"peer-login-expiration-select-content"}
                    >
                      <SelectItem value="days">{t("days")}</SelectItem>
                      <SelectItem value="hours">{t("hours")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FancyToggleSwitch
                variant={"blank"}
                value={peerInactivityExpirationEnabled}
                onChange={setPeerInactivityExpirationEnabled}
                data-testid={"peer-inactivity-expiration"}
                label={<>{t("requireLoginAfterDisconnect")}</>}
                disabled={!permission.settings.update}
                helpText={
                  <>
                    {t("requireLoginHelp")}
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {isNetBirdCloud() && (
        <>
          <Separator />
          <div className={"p-default py-8 max-w-2xl"}>
            <div className={"max-w-6xl"}>
              <AccountMFASettings />
            </div>
          </div>
        </>
      )}
    </Tabs.Content>
  );
}
