import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
import { useExpirationState } from "@hooks/useExpirationState";
import { convertToSeconds } from "@hooks/useTimeFormatter";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  CalendarClock,
  ExternalLinkIcon,
  ShieldIcon,
  ShieldUserIcon,
  TimerResetIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function AuthenticationTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { mutate } = useSWRConfig();

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
  ]);

  const saveChanges = async () => {
    const expiration = convertToSeconds(expiresIn, expireInterval);

    notify({
      title: t("authenticationTab.saveTitle"),
      description: t("authenticationTab.saveDescription"),
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
              peer_approval_enabled: peerApproval,
              user_approval_required: userApprovalRequired,
            },
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
          ]);
        }),
      loadingMessage: t("authenticationTab.saving"),
    });
  };

  return (
    <Tabs.Content value={"authentication"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.authentication")}
            icon={<ShieldIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>{t("settings.authentication")}</h1>
            <Paragraph>
              {t("common.learnMorePrefix")}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/enforce-periodic-user-authentication"
                }
                target={"_blank"}
              >
                {t("settings.authentication")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>

          <Button
            variant={"primary"}
            disabled={!hasChanges || !permission.settings.update}
            onClick={saveChanges}
            data-cy={"save-authentication-settings"}
          >
            {t("actions.saveChanges")}
          </Button>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8 mb-3"}>
          <div className={"flex flex-col"}>
            <FancyToggleSwitch
              value={userApprovalRequired}
              onChange={setUserApprovalRequired}
              dataCy={"user-approval-required"}
              label={
                <>
                  <ShieldUserIcon size={15} />
                  {t("authenticationTab.userApprovalLabel")}
                </>
              }
              helpText={
                <>
                  {t("authenticationTab.userApprovalHelpLine1")} <br />
                  {t("authenticationTab.userApprovalHelpLine2")}
                </>
              }
              disabled={!permission.settings.update}
            />
          </div>

          <div className={"flex flex-col"}>
            <FancyToggleSwitch
              value={loginExpiration}
              onChange={(state) => {
                setLoginExpiration(state);
                !state && setPeerInactivityExpirationEnabled(false);
              }}
              dataCy={"peer-login-expiration"}
              label={
                <>
                  <TimerResetIcon size={15} />
                  {t("authenticationTab.peerSessionLabel")}
                </>
              }
              helpText={
                <>
                  {t("authenticationTab.peerSessionHelpLine1")} <br />
                  {t("authenticationTab.peerSessionHelpLine2")}
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
                  <Label>{t("authenticationTab.sessionExpiration")}</Label>
                  <HelpText>
                    {t("authenticationTab.sessionExpirationHelp")}
                  </HelpText>
                </div>
                <div className={"w-full flex gap-3"}>
                  <Input
                    placeholder={"7"}
                    maxWidthClass={"min-w-[100px]"}
                    min={1}
                    disabled={!loginExpiration || !permission.settings.update}
                    data-cy={"peer-login-expiration-input"}
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
                      data-cy={"peer-login-expiration-select"}
                    >
                      <div className={"flex items-center gap-3"}>
                        <CalendarClock
                          size={15}
                          className={"text-nb-gray-300"}
                        />
                        <SelectValue
                          placeholder={t("authenticationTab.selectInterval")}
                          data-cy={"peer-login-expiration-select-value"}
                        />
                      </div>
                    </SelectTrigger>
                    <SelectContent
                      data-cy={"peer-login-expiration-select-content"}
                    >
                      <SelectItem value="days">
                        {t("authenticationTab.days")}
                      </SelectItem>
                      <SelectItem value="hours">
                        {t("authenticationTab.hours")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FancyToggleSwitch
                variant={"blank"}
                value={peerInactivityExpirationEnabled}
                onChange={setPeerInactivityExpirationEnabled}
                dataCy={"peer-inactivity-expiration"}
                label={<>{t("authenticationTab.requireLoginAfterDisconnect")}</>}
                disabled={!permission.settings.update}
                helpText={
                  <>
                    {t("authenticationTab.requireLoginAfterDisconnectHelp")}
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
