import FancyToggleSwitch, {
  FancyToggleSwitchVariants,
} from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import { LockIcon } from "lucide-react";
import * as React from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
  value: boolean;
  onChange: (value: boolean) => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
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
}: Props) => {
  const { isUser } = useLoggedInUser();

  return (
    <FullTooltip
      content={
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
      }
      className={"w-full block"}
      disabled={!!peer.user_id && !isUser}
    >
      <FancyToggleSwitch
        className={className}
        disabled={!peer.user_id || isUser}
        value={value}
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
