import { cn, generateColorFromUser } from "@utils/helpers";
import useFetchApi from "@utils/api";
import { Ban, Clock, Cog } from "lucide-react";
import React, { useMemo } from "react";
import { User } from "@/interfaces/User";
import { SSOIdentityProvider } from "@/interfaces/IdentityProvider";
import { useAccount } from "@/modules/account/useAccount";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { idpIcon } from "@/assets/icons/IdentityProviderIcons";

type Props = {
  user: User;
};

export default function UserNameCell({ user }: Readonly<Props>) {
  const account = useAccount();
  const embeddedIdpEnabled = account?.settings.embedded_idp_enabled;

  const { data: identityProviders } = useFetchApi<SSOIdentityProvider[]>(
    "/identity-providers",
    false,
    true,
    embeddedIdpEnabled === true,
  );

  const userIdp = useMemo(() => {
    if (!user.idp_id || !identityProviders) return null;
    return identityProviders.find((idp) => idp.id === user.idp_id);
  }, [user.idp_id, identityProviders]);
  const status = user.status;
  const isCurrent = user.is_current;

  const getStatusIcon = () => {
    if (user?.pending_approval) {
      return {
        color: "bg-netbird text-netbird-950",
        icon: <Clock size={12} />,
      };
    }
    if (status === "blocked") {
      return { color: "bg-red-500 text-red-100", icon: <Ban size={12} /> };
    }
    if (status === "invited") {
      return {
        color: "bg-yellow-400 text-yellow-900",
        icon: <Clock size={12} />,
      };
    }
    return { color: "bg-gray-400", icon: <Clock size={12} /> };
  };

  const { color, icon } = getStatusIcon();

  return (
    <div
      className={cn("flex gap-4 px-2 py-1 items-center")}
      data-cy={"user-name-cell"}
    >
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: generateColorFromUser(user),
        }}
      >
        {!user?.name && !user?.id && <Cog size={12} />}
        {user?.name?.charAt(0) || user?.id?.charAt(0)}
        {(status == "invited" || status == "blocked") && (
          <div
            className={cn(
              "w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950",
              color,
            )}
          >
            {icon}
          </div>
        )}
        {userIdp && status !== "invited" && status !== "blocked" && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950 text-nb-gray-50">
                  {idpIcon(userIdp.type, 14)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                <span className="text-xs">{userIdp.name}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {user.name || user.id}
          {isCurrent && (
            <span
              className={
                "bg-sky-900 border border-sky-700 text-sky-200 rounded-full text-[9px] uppercase tracking-wider px-2 py-2 leading-[0]"
              }
            >
              You
            </span>
          )}
        </span>
        <span className={cn("text-sm text-nb-gray-400")}>{user.email}</span>
      </div>
    </div>
  );
}
