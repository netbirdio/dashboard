import FancyToggleSwitch, {
  FancyToggleSwitchVariants,
} from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import { ArrowUpRightIcon, LockIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import InlineLink from "@components/InlineLink";
import { useAccount } from "@/modules/account/useAccount";

type Props = {
  peer: Peer;
  value: boolean;
  onChange: (value: boolean) => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  type?: "login-expiration" | "inactivity-expiration";
} & FancyToggleSwitchVariants;

export const PeerExpirationToggle = ({
  peer,
  value,
  onChange,
  title = "Session Expiration",
  description = "Enable to require SSO login peers to re-authenticate when their session expires after a certain period of time.",
  icon,
  className,
  variant = "default",
  type = "login-expiration",
}: Props) => {
  const { permission } = usePermissions();
  const account = useAccount();

  const noPermissionOrNoUser = !peer.user_id || !permission?.peers.update;

  const isAccountLoginExpirationDisabled =
    account && account?.settings?.peer_login_expiration_enabled === false;
  const isAccountInactivityExpirationDisabled =
    account && account?.settings?.peer_inactivity_expiration_enabled === false;

  const isGlobalSettingDisabled =
    type === "login-expiration"
      ? isAccountLoginExpirationDisabled
      : isAccountInactivityExpirationDisabled;

  const tooltipContent = useMemo(() => {
    if (noPermissionOrNoUser) {
      return (
        <div className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}>
          {!peer.user_id ? (
            <>
              <IconInfoCircle size={14} />
              <span>
                This setting is disabled for all peers added with an setup-key.
              </span>
            </>
          ) : (
            <>
              <LockIcon size={14} />
              <span>
                {`You don't have the required permissions to update this setting.`}
              </span>
            </>
          )}
        </div>
      );
    }
    if (isGlobalSettingDisabled) {
      const text =
        type === "login-expiration"
          ? "'Peer Session Expiration'"
          : "'Require login after disconnect'";
      return (
        <div className={"flex flex-col gap-2 text-xs max-w-xs"}>
          <div>
            Global setting {text} is currently disabled. Enable the global
            setting to be able to toggle it individually per peer.{"  "}
            <InlineLink href={"/settings"}>
              Go to Settings <ArrowUpRightIcon size={12} />
            </InlineLink>
          </div>
        </div>
      );
    }
  }, [noPermissionOrNoUser, peer, type, isGlobalSettingDisabled]);

  return (
    <FullTooltip
      content={tooltipContent}
      className={"w-full block"}
      disabled={tooltipContent === undefined}
    >
      <FancyToggleSwitch
        className={className}
        disabled={isGlobalSettingDisabled || noPermissionOrNoUser}
        value={isGlobalSettingDisabled ? false : value}
        onChange={onChange}
        variant={variant}
        label={
          <>
            {icon}
            {title}
          </>
        }
        helpText={description}
      />
    </FullTooltip>
  );
};
