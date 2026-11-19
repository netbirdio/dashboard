import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import {
  Cog,
  CreditCardIcon,
  EyeIcon,
  GaugeIcon,
  NetworkIcon,
  User2,
} from "lucide-react";
import React from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Role, User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserRoleCell({ user }: Readonly<Props>) {
  const t = useTranslations();
  const role = user.role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role == "owner" ? "netbird" : "gray"}>
        {role === Role.User && (
          <>
            <User2 size={14} />
            {t("users.user")}
          </>
        )}
        {role === Role.Admin && (
          <>
            <Cog size={14} />
            {t("users.admin")}
          </>
        )}
        {role === Role.Owner && (
          <>
            <NetBirdIcon size={14} />
            {t("users.owner")}
          </>
        )}
        {role === Role.BillingAdmin && (
          <>
            <CreditCardIcon size={14} />
            {t("users.billingAdmin")}
          </>
        )}
        {role === Role.Auditor && (
          <>
            <EyeIcon size={14} />
            {t("users.auditor")}
          </>
        )}
        {role === Role.NetworkAdmin && (
          <>
            <NetworkIcon size={14} />
            {t("users.networkAdmin")}
          </>
        )}
        {role === Role.AgentNetworkAdmin && (
          <>
            <AgentNetworkIcon size={14} />
            {t("common.agentNetworkAdmin")}
          </>
        )}
        {role === Role.UsageViewer && (
          <>
            <GaugeIcon size={14} />
            {t("users.usageViewer")}
          </>
        )}
      </Badge>
    </div>
  );
}
