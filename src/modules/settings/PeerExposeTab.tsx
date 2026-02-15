import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { AnimatePresence, motion } from "framer-motion";
import { GlobeIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Account } from "@/interfaces/Account";
import { Group } from "@/interfaces/Group";
import { useGroupIdsToGroups } from "@/modules/groups/useGroupIdsToGroups";

type Props = {
  account: Account;
};

export default function PeerExposeTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const [peerExposeEnabled, setPeerExposeEnabled] = useState<boolean>(
    account?.settings?.extra?.peer_expose_enabled ?? false,
  );

  const initialGroups = useGroupIdsToGroups(
    account?.settings?.extra?.peer_expose_groups,
  );
  const [peerExposeGroups, setPeerExposeGroups] = useState<Group[]>([]);

  const groupIds = useMemo(
    () => peerExposeGroups.map((g) => g.id).filter(Boolean) as string[],
    [peerExposeGroups],
  );

  const { hasChanges, updateRef } = useHasChanges([
    peerExposeEnabled,
    groupIds,
  ]);

  React.useEffect(() => {
    if (initialGroups) {
      setPeerExposeGroups(initialGroups);
    }
  }, [initialGroups]);

  const saveChanges = async () => {
    notify({
      title: "Peer Expose Settings",
      description: "Peer expose settings were updated successfully.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            extra: {
              ...account.settings?.extra,
              peer_expose_enabled: peerExposeEnabled,
              peer_expose_groups: groupIds,
            },
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([peerExposeEnabled, groupIds]);
        }),
      loadingMessage: "Updating peer expose settings...",
    });
  };

  return (
    <Tabs.Content value={"peer-expose"} className={"w-full"}>
      <div className={"p-default py-6 max-w-xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=peer-expose"}
            label={"Peer Expose"}
            icon={<GlobeIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Peer Expose</h1>
          <Button
            variant={"primary"}
            disabled={!hasChanges || !permission.settings.update}
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 mt-8 mb-3"}>
          <FancyToggleSwitch
            value={peerExposeEnabled}
            onChange={setPeerExposeEnabled}
            label={
              <>
                <GlobeIcon size={15} />
                Enable peer expose
              </>
            }
            helpText={
              "Allow peers to expose local services through the NetBird reverse proxy using the CLI."
            }
            disabled={!permission.settings.update}
          />
        </div>

        <AnimatePresence>
          {peerExposeEnabled && (
            <div className={"overflow-hidden -top-4 relative z-0"}>
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
              >
                <div
                  className={
                    "flex flex-col gap-6 bg-nb-gray-940 px-6 pt-5 pb-6 border border-nb-gray-930 rounded-b-md relative mx-3"
                  }
                >
                  <div>
                    <Label>Allowed peer groups</Label>
                    <HelpText>
                      Restrict which peer groups are allowed to expose services.
                      Leave empty to allow all peers.
                    </HelpText>
                    <PeerGroupSelector
                      values={peerExposeGroups}
                      onChange={setPeerExposeGroups}
                      placeholder="Select peer groups..."
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Tabs.Content>
  );
}
