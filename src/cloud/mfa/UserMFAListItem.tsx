import Button from "@components/Button";
import Card from "@components/Card";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  HelpCircle,
  Loader2Icon,
  RotateCcw,
  ShieldCheckIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import { AccountMFA } from "@/cloud/mfa/AccountMFASettings";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";

const config = loadConfig();

type Props = {
  userId: string;
};

export const UserMfaListItem = ({ userId }: Props) => {
  const { permission } = usePermissions();
  return permission.settings.update && isNetBirdCloud() ? (
    <ListItem userId={userId} />
  ) : null;
};

interface UserAuthMethods {
  type: string;
  confirmed: boolean;
}

const ListItem = ({ userId }: Props) => {
  const { data: userMfa, isLoading: isUserMfaLoading } = useFetchApi<
    UserAuthMethods[]
  >(`/service/mfa/${userId}`, true, false, !!config.authServiceUrl, {
    origin: config.authServiceUrl,
  });

  const { data: accountMfa, isLoading: isAccountMfaLoading } =
    useFetchApi<AccountMFA>(
      `/service/mfa`,
      true,
      true,
      !!config.authServiceUrl,
      {
        origin: config.authServiceUrl,
      },
    );

  const hasAuthMethods = !!(userMfa && userMfa.length >= 1);
  const isLoading = isUserMfaLoading || isAccountMfaLoading;

  return (
    <Card.ListItem
      tooltip={false}
      label={
        <>
          <ShieldCheckIcon size={16} />
          NetBird MFA
          <FullTooltip
            variant={"lighter"}
            content={
              <div className={"text-xs max-w-xs"}>
                NetBird MFA is primarily intended for users who log in with
                email and password. You may not need NetBird MFA if your SSO
                provider (e.g., Google, Microsoft) already has MFA enabled.{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/multi-factor-authentication"
                  }
                  target={"_blank"}
                >
                  Learn more
                  <ExternalLinkIcon size={10} />
                </InlineLink>
              </div>
            }
          >
            <HelpCircle
              size={14}
              className={
                "text-nb-gray-300 hover:text-nb-gray-100 transition-all cursor-help"
              }
            />
          </FullTooltip>
        </>
      }
      value={
        isLoading ? (
          <div className={"flex z-10 h-[30px] items-center"}>
            <Skeleton height={20} width={150} />
          </div>
        ) : (
          <MFAStatus
            enabled={accountMfa?.mfa ?? false}
            hasAuthMethods={hasAuthMethods}
            userId={userId}
          />
        )
      }
    />
  );
};

const MFAStatus = ({
  enabled,
  hasAuthMethods,
  userId,
}: {
  enabled: boolean;
  hasAuthMethods: boolean;
  userId: string;
}) => {
  return (
    <div className={"flex gap-4 items-center"}>
      {hasAuthMethods && enabled && <ResetMFAButton userId={userId} />}

      {enabled ? (
        <div
          className={cn(
            "flex gap-2.5 items-center text-nb-gray-300 text-sm h-[30px]",
          )}
        >
          {hasAuthMethods ? (
            <>
              <span className={cn("h-2 w-2 rounded-full", "bg-green-500")} />{" "}
              Active
            </>
          ) : (
            <>
              <span className={cn("h-2 w-2 rounded-full", "bg-yellow-400")} />{" "}
              Not Enrolled
            </>
          )}
        </div>
      ) : (
        <div className={"h-[30px] flex items-center"}>
          <InlineLink href={"/settings?tab=authentication"}>
            Activate
            <ArrowUpRightIcon size={14} />
          </InlineLink>
        </div>
      )}
    </div>
  );
};

const ResetMFAButton = ({ userId }: Props) => {
  const mfaDeleteRequest = useApiCall(`/service/mfa/${userId}`, true, {
    origin: config.authServiceUrl,
  }).del;
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  const resetMFA = async () => {
    const choice = await confirm({
      title: `Reset Multi-factor Authentication?`,
      description:
        "Are you sure you want to reset the current MFA methods for this user? The user will be prompted to set up MFA again on their next login.",
      confirmText: "Confirm",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;

    setIsLoading(true);
    notify({
      title: "Multi-factor authentication (MFA)",
      description: "MFA settings have been reset",
      loadingMessage: "Resetting MFA for user...",
      promise: mfaDeleteRequest({}).finally(() =>
        mutate(`/service/mfa/${userId}`).then(() => setIsLoading(false)),
      ),
    });
  };

  return (
    <Button
      size={"xs"}
      variant={"secondary"}
      className={"h-[30px]"}
      onClick={resetMFA}
    >
      {isLoading ? (
        <Loader2Icon size={12} className={"block animate-spin"} />
      ) : (
        <RotateCcw size={12} />
      )}
      Reset MFA
    </Button>
  );
};
