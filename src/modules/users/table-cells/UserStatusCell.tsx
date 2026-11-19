import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, HelpCircle } from "lucide-react";
import React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { User } from "@/interfaces/User";
import { useAccount } from "@/modules/account/useAccount";

type Props = {
  user: User;
};

export default function UserStatusCell({ user }: Readonly<Props>) {
  const t = useTranslations();
  const account = useAccount();
  const status = user.status;
  const isPendingApproval = user.pending_approval;
  const isLocalAuthDisabled =
    account?.settings?.local_auth_disabled === true && user.idp_id === "local";

  const getStatusDisplay = () => {
    if (isLocalAuthDisabled) {
      return { text: t("common.disabled"), color: "bg-gray-400" };
    }
    if (isPendingApproval) {
      return { text: t("common.pending"), color: "bg-netbird" };
    }
    if (status === "blocked") {
      return { text: t("common.blocked"), color: "bg-red-500" };
    }
    if (status === "invited") {
      return { text: t("common.invited"), color: "bg-yellow-400" };
    }
    if (status === "active") {
      return { text: t("users.activeStatus"), color: "bg-green-500" };
    }
    return { text: status || t("common.unknown"), color: "bg-gray-400" };
  };

  const isInvitedOnCloud = status === "invited" && isNetBirdCloud();

  const tooltipContent = isLocalAuthDisabled ? (
    <div className={"max-w-xs text-xs flex flex-col gap-2"}>
      <div>{t("users.localAuthDisabledTooltip")}</div>
      <div>
        <InlineLink
          href={
            "https://docs.netbird.io/selfhosted/identity-providers/disable-local-authentication"
          }
          target={"_blank"}
        >
          {t("common.learnMore") + " "}
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </div>
    </div>
  ) : isInvitedOnCloud ? (
    <div className={"max-w-xs text-xs flex flex-col gap-2"}>
      <div>{t("users.invitedTooltip")}</div>
    </div>
  ) : (
    <div className={"max-w-xs text-xs flex flex-col gap-2"}>
      <div>
        {t.rich("users.pendingApprovalHint", {
          setting: (chunks) => (
            <span className="font-medium text-white">{chunks}</span>
          ),
          settingsLink: (chunks) => (
            <InlineLink href="/settings?tab=authentication">
              {chunks}
            </InlineLink>
          ),
        })}
      </div>
      <div>
        <InlineLink
          href={"https://docs.netbird.io/how-to/approve-users"}
          target={"_blank"}
        >
          {t("common.learnMore") + " "}
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </div>
    </div>
  );

  const showTooltip =
    isLocalAuthDisabled || isPendingApproval || isInvitedOnCloud;
  const { text, color } = getStatusDisplay();

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <FullTooltip
        content={tooltipContent}
        interactive={true}
        side="right"
        disabled={!showTooltip}
      >
        <div
          className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
          data-testid={"user-status-cell"}
        >
          <span className={cn("h-2 w-2 rounded-full", color)}></span>
          {text}
          {showTooltip && (
            <HelpCircle size={14} className="text-netbird cursor-help" />
          )}
        </div>
      </FullTooltip>
    </div>
  );
}
