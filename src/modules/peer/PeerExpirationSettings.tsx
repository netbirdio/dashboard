import * as React from "react";
import { useState } from "react";
import { PeerExpirationToggle } from "@/modules/peer/PeerExpirationToggle";
import { usePeer } from "@/contexts/PeerProvider";
import { TimerResetIcon } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { notify } from "@components/Notification";
import { useSWRConfig } from "swr";
import { cn } from "@utils/helpers";
import { useAccount } from "@/modules/account/useAccount";
import { useI18n } from "@/i18n/I18nProvider";

export const PeerExpirationSettings = () => {
  const { t } = useI18n();
  const { peer, update } = usePeer();
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const account = useAccount();

  const [peerLoginExpiration, setPeerLoginExpiration] = useState(
    peer.login_expiration_enabled,
  );
  const [peerInactivityExpiration, setPeerInactivityExpiration] = useState(
    peer.inactivity_expiration_enabled,
  );

  const updateExpiration = async ({
    loginExpiration,
    inactivityExpiration,
  }: {
    loginExpiration?: boolean;
    inactivityExpiration?: boolean;
  }) => {
    if (!permission?.peers.update) return;

    const promise = update({
      loginExpiration,
      inactivityExpiration,
    }).then(() => {
      mutate("/peers/" + peer.id);
    });

    notify({
      title: peer.name,
      description: t("peer.expirationUpdated"),
      promise,
      loadingMessage: t("peer.updatingSetting"),
    });

    return promise;
  };

  const isAccountInactivityExpirationDisabled =
    account && account?.settings?.peer_inactivity_expiration_enabled === false;

  return (
    <div>
      <PeerExpirationToggle
        peer={peer}
        value={peerLoginExpiration}
        icon={<TimerResetIcon size={16} />}
        type={"login-expiration"}
        onChange={async (state) => {
          setPeerLoginExpiration(state);
          !state && setPeerInactivityExpiration(false);

          await updateExpiration({
            loginExpiration: state,
            inactivityExpiration: !state ? false : undefined,
          });
        }}
      />
      {permission?.peers.update && !!peer?.user_id && (
        <div
          className={cn(
            "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
            !peerLoginExpiration
              ? "opacity-50 pointer-events-none"
              : "bg-nb-gray-930/80",
            isAccountInactivityExpirationDisabled &&
              "opacity-50 bg-nb-gray-940",
          )}
        >
          <PeerExpirationToggle
            peer={peer}
            variant={"blank"}
            type={"inactivity-expiration"}
            value={peerInactivityExpiration}
            onChange={async (state) => {
              setPeerInactivityExpiration(state);
              await updateExpiration({
                inactivityExpiration: state,
              });
            }}
            title={t("peer.requireLoginAfterDisconnect")}
            description={t("peer.requireLoginAfterDisconnectDescription")}
            className={
              !peerLoginExpiration ? "opacity-40 pointer-events-none" : ""
            }
          />
        </div>
      )}
    </div>
  );
};
