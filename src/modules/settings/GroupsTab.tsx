import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import { AnimatePresence, motion } from "framer-motion";
import { isEmpty } from "lodash";
import {
  AlertCircle,
  Braces,
  FolderGit2Icon,
  FolderInput,
  FolderSync,
  ShieldCheck,
} from "lucide-react";
import React, { lazy, Suspense, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Account } from "@/interfaces/Account";

const GroupsTable = lazy(() => import("@/modules/settings/GroupsTable"));

type Props = {
  account: Account;
};

export default function GroupsTab({ account }: Props) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  /**
   * Group Propagation
   */
  const [groupsPropagation, setGroupsPropagation] = useState<boolean>(
    account.settings.groups_propagation_enabled,
  );

  /**
   * JWT Group Sync
   */
  const [jwtGroupSync, setJwtGroupSync] = useState<boolean>(
    account.settings.jwt_groups_enabled,
  );
  const [jwtGroupsClaimName, setJwtGroupsClaimName] = useState(
    account.settings.jwt_groups_claim_name,
  );
  const [jwtAllowGroups, setJwtAllowGroups] = useState<string[]>(
    account.settings.jwt_allow_groups,
  );
  const [jwtAllowGroupsWarning, setJwtAllowGroupsWarning] = useState(false);

  /**
   * Detect changes
   */
  const { hasChanges, updateRef } = useHasChanges([
    groupsPropagation,
    jwtAllowGroups,
    jwtGroupsClaimName,
    jwtGroupSync,
  ]);

  /**
   * Save Group Propagation
   */
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const saveChanges = async () => {
    const jwtGroupsEntered =
      jwtAllowGroups.filter((g) => !isEmpty(g)).length > 0;
    const showConfirm = jwtGroupSync && jwtGroupsEntered;
    const choice = showConfirm
      ? await confirm({
          title: `JWT allow group - ${jwtAllowGroups[0]}`,
          description: `Only users part of the ${jwtAllowGroups[0]} group will be able to access NetBird. Are you sure you want to save the changes?`,
          confirmText: "Save",
          children: (
            <div
              className={
                "flex gap-2 items-center text-xs bg-netbird-950 px-4 justify-center py-3 rounded-md border border-netbird-500 text-netbird-200"
              }
            >
              <AlertCircle size={14} />
              To prevent losing access, ensure you are part of this group.
            </div>
          ),
          cancelText: "Cancel",
          type: "default",
        })
      : true;

    if (!choice) return;

    notify({
      title: "Group Settings",
      description: "Group settings were updated successfully.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            groups_propagation_enabled: groupsPropagation,
            peer_login_expiration_enabled:
              account.settings.peer_login_expiration_enabled,
            peer_login_expiration: account.settings.peer_login_expiration,
            jwt_groups_enabled: jwtGroupSync,
            jwt_groups_claim_name: isEmpty(jwtGroupsClaimName)
              ? undefined
              : jwtGroupsClaimName,
            jwt_allow_groups: jwtGroupsEntered ? jwtAllowGroups : undefined,
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            groupsPropagation,
            jwtAllowGroups,
            jwtGroupsClaimName,
            jwtGroupSync,
          ]);
        }),
      loadingMessage: "Updating group settings...",
    });
  };

  return (
    <Tabs.Content value={"groups"} className={"w-full"}>
      <div className={"p-default py-6 max-w-xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={"User Groups"}
            icon={<FolderGit2Icon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>User Groups</h1>
          <Button
            variant={"primary"}
            disabled={!hasChanges}
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 mt-8 mb-3"}>
          <FancyToggleSwitch
            value={groupsPropagation}
            onChange={setGroupsPropagation}
            label={
              <>
                <FolderInput size={15} />
                Enable user group propagation
              </>
            }
            helpText={
              "Allow group propagation from user’s auto-groups to peers, sharing membership information."
            }
          />
          {(!isNetBirdHosted() || isLocalDev()) && (
            <FancyToggleSwitch
              value={jwtGroupSync}
              onChange={setJwtGroupSync}
              label={
                <>
                  <FolderSync size={15} />
                  Enable JWT group sync
                </>
              }
              helpText={
                "Extract & sync groups from JWT claims with user’s auto-groups, auto-creating groups from tokens."
              }
            />
          )}
        </div>

        {(!isNetBirdHosted() || isLocalDev()) && (
          <AnimatePresence>
            {jwtGroupSync && (
              <div className={"overflow-hidden -top-4 relative z-0"}>
                <motion.div
                  className={""}
                  initial={{ opacity: 0, height: 0, scale: 0.98 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.98 }}
                >
                  <div
                    className={cn(
                      !jwtGroupSync && "opacity-50 pointer-events-none",
                      "flex flex-col gap-6 bg-nb-gray-940 px-6 pt-5 pb-6 border border-nb-gray-930 rounded-b-md relative mx-3",
                    )}
                  >
                    <div>
                      <Label>JWT claim</Label>
                      <HelpText>
                        Specify the JWT claim for extracting group names, e.g.,
                        roles or groups, to add to account groups (this claim
                        should contain a list of group names).
                      </HelpText>
                      <Input
                        customPrefix={
                          <Braces size={16} className={"text-nb-gray-300"} />
                        }
                        onKeyDown={(event) => {
                          if (event.code === "Space") event.preventDefault();
                        }}
                        placeholder={"e.g., roles"}
                        value={jwtGroupsClaimName}
                        onChange={(e) => {
                          setJwtGroupsClaimName(
                            e.target.value.replace(/ /g, ""),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <Label>JWT allow group</Label>
                      <HelpText>
                        Limit access to NetBird for the specified group name,
                        e.g., NetBird users. To use the group, you need to
                        configure it first in your IdP.
                      </HelpText>
                      <Input
                        customPrefix={
                          <ShieldCheck
                            size={16}
                            className={"text-nb-gray-300"}
                          />
                        }
                        placeholder={"e.g., NetBird users"}
                        value={jwtAllowGroups[0]}
                        onChange={(e) => {
                          setJwtAllowGroups([e.target.value]);
                          setJwtAllowGroupsWarning(true);
                          if (e.target.value === "")
                            setJwtAllowGroupsWarning(false);
                        }}
                      />
                    </div>
                    {jwtAllowGroupsWarning && (
                      <div
                        className={
                          "flex gap-2 items-center text-xs bg-netbird-950 px-4 justify-center py-3 rounded-md border border-netbird-500 text-netbird-200"
                        }
                      >
                        <AlertCircle size={14} />
                        To prevent losing access, ensure you are part of this
                        group.
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
      <>
        <Separator />
        <div className={"px-8 py-6"}>
          <div className={"max-w-6xl"}>
            <div className={"flex justify-between items-center"}>
              <div>
                <h2>Groups</h2>
                <Paragraph>
                  Here is the overview of the groups of your account. You can
                  delete the unused ones.
                </Paragraph>
              </div>
            </div>
          </div>
        </div>
        <div className={"pb-10"}>
          <Suspense fallback={<SkeletonTable />}>
            <GroupsTable />
          </Suspense>
        </div>
      </>
    </Tabs.Content>
  );
}
