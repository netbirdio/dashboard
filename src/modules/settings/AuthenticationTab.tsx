import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn, isInt } from "@utils/helpers";
import { CalendarClock, ShieldIcon, TimerReset } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function AuthenticationTab({ account }: Props) {
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
   * Login expiration enabled
   */
  const [loginExpiration, setLoginExpiration] = useState(
    account.settings.peer_login_expiration_enabled,
  );

  /**
   * Expiration in seconds
   */
  const [expiresInSeconds] = useState(
    account.settings.peer_login_expiration || 86400,
  );

  const [expiresIn, setExpiresIn] = useState(() => {
    if (expiresInSeconds <= 172800) {
      const hours = expiresInSeconds / 3600;
      return isInt(hours) ? hours.toString() : hours.toFixed(2).toString();
    }
    const days = expiresInSeconds / 86400;
    return isInt(days) ? days.toString() : days.toFixed(2).toString();
  });

  /**
   * Interval
   */
  const initialInterval = useMemo(() => {
    if (expiresInSeconds <= 172800) return "hours";
    return "days";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expireInterval, setExpireInterval] = useState(initialInterval);

  /**
   * Save changes
   */
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const { hasChanges, updateRef } = useHasChanges([
    peerApproval,
    loginExpiration,
    expiresIn,
    expireInterval,
  ]);

  const saveChanges = async () => {
    const expiration =
      expireInterval === "days"
        ? Number(expiresIn) * 86400
        : Number(expiresIn) * 3600;

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
            extra: {
              peer_approval_enabled: peerApproval,
            },
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([peerApproval, loginExpiration, expiresIn, expireInterval]);
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
          <h1>Authentication</h1>
          <Button
            variant={"primary"}
            disabled={!hasChanges}
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          <div>
            <FancyToggleSwitch
              value={loginExpiration}
              onChange={setLoginExpiration}
              label={
                <>
                  <TimerReset size={15} />
                  Peer login expiration
                </>
              }
              helpText={
                <>
                  Request periodic re-authentication of peers <br />
                  registered with SSO.
                </>
              }
            />
          </div>
          <div
            className={cn(
              "flex justify-between gap-6",
              !loginExpiration && "opacity-50",
            )}
          >
            <div className={"w-auto"}>
              <Label>Expires in</Label>
              <HelpText>
                Time after which every peer added with SSO login will require
                re-authentication
              </HelpText>
            </div>
            <div className={"w-full flex gap-3"}>
              <Input
                placeholder={"7"}
                maxWidthClass={"min-w-[100px]"}
                min={1}
                disabled={!loginExpiration}
                max={180}
                className={"w-full"}
                value={expiresIn}
                type={"number"}
                onChange={(e) => setExpiresIn(e.target.value)}
              />
              <Select
                disabled={!loginExpiration}
                value={expireInterval}
                onValueChange={(v) => setExpireInterval(v)}
              >
                <SelectTrigger className="w-full">
                  <div className={"flex items-center gap-3"}>
                    <CalendarClock size={15} className={"text-nb-gray-300"} />
                    <SelectValue placeholder="Select interval..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Multi-factor authentication (MFA)</Label>
            <HelpText className={"inline"}>
              <>
                If your IdP supports MFA, it will work automatically with
                NetBird.
                <br /> Otherwise, contact us at{" "}
                <InlineLink
                  href={"mailto:support@netbird.io"}
                  className={"inline"}
                >
                  {" "}
                  support@netbird.io
                </InlineLink>{" "}
                to enable this feature.
              </>
            </HelpText>
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
