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
import { Role, User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserRoleCell({ user }: Readonly<Props>) {
  const role = user.role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role == "owner" ? "netbird" : "gray"}>
        {role === Role.User && (
          <>
            <User2 size={14} />
            User
          </>
        )}
        {role === Role.Admin && (
          <>
            <Cog size={14} />
            Admin
          </>
        )}
        {role === Role.Owner && (
          <>
            <NetBirdIcon size={14} />
            Owner
          </>
        )}
        {role === Role.BillingAdmin && (
          <>
            <CreditCardIcon size={14} />
            Billing Admin
          </>
        )}
        {role === Role.Auditor && (
          <>
            <EyeIcon size={14} />
            Auditor
          </>
        )}
        {role === Role.NetworkAdmin && (
          <>
            <NetworkIcon size={14} />
            Network Admin
          </>
        )}
        {role === Role.AgentNetworkAdmin && (
          <>
            <AgentNetworkIcon size={14} />
            Agent Network Admin
          </>
        )}
        {role === Role.UsageViewer && (
          <>
            <GaugeIcon size={14} />
            Usage Viewer
          </>
        )}
      </Badge>
    </div>
  );
}
