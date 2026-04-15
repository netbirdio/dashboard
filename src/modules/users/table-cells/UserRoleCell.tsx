import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Cog, CreditCardIcon, EyeIcon, NetworkIcon, User2 } from "lucide-react";
import React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { Role, User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserRoleCell({ user }: Readonly<Props>) {
  const { t } = useI18n();
  const role = user.role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role == "owner" ? "netbird" : "gray"}>
        {role === Role.User && (
          <>
            <User2 size={14} />
            {t("userRoles.user")}
          </>
        )}
        {role === Role.Admin && (
          <>
            <Cog size={14} />
            {t("userRoles.admin")}
          </>
        )}
        {role === Role.Owner && (
          <>
            <NetBirdIcon size={14} />
            {t("userRoles.owner")}
          </>
        )}
        {role === Role.BillingAdmin && (
          <>
            <CreditCardIcon size={14} />
            {t("userRoles.billingAdmin")}
          </>
        )}
        {role === Role.Auditor && (
          <>
            <EyeIcon size={14} />
            {t("userRoles.auditor")}
          </>
        )}
        {role === Role.NetworkAdmin && (
          <>
            <NetworkIcon size={14} />
            {t("userRoles.networkAdmin")}
          </>
        )}
      </Badge>
    </div>
  );
}
