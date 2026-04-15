import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
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
  X,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import Badge from "@/components/Badge";
import { Callout } from "@components/Callout";
import { InlineButtonLink } from "@components/InlineLink";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";
import { useRouter } from "next/navigation";

type Props = {
  account: Account;
};

export default function GroupsSettings({ account }: Props) {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [groupsPropagation, setGroupsPropagation] = useState<boolean>(
    account.settings.groups_propagation_enabled,
  );
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

  const { hasChanges, updateRef } = useHasChanges([
    groupsPropagation,
    jwtAllowGroups,
    jwtGroupsClaimName,
    jwtGroupSync,
  ]);

  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const saveChanges = async () => {
    const jwtGroupsEntered =
      jwtAllowGroups.filter((g) => !isEmpty(g)).length > 0;
    const showConfirm = jwtGroupSync && jwtGroupsEntered;
    const choice = showConfirm
      ? await confirm({
          title: t("groupsSettings.jwtAllowGroupTitle", {
            group: jwtAllowGroups[0],
          }),
          description: t("groupsSettings.jwtAllowGroupDescription", {
            group: jwtAllowGroups[0],
          }),
          confirmText: t("groupsSettings.save"),
          children: (
            <div
              className={
                "flex gap-2 items-center text-xs bg-netbird-950 px-4 justify-center py-3 rounded-md border border-netbird-500 text-netbird-200"
              }
            >
              <AlertCircle size={14} />
              {t("groupsSettings.accessWarning")}
            </div>
          ),
          cancelText: t("actions.cancel"),
          type: "default",
        })
      : true;

    if (!choice) return;

    notify({
      title: t("groupsSettings.notifyTitle"),
      description: t("groupsSettings.updatedDescription"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            groups_propagation_enabled: groupsPropagation,
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
      loadingMessage: t("groupsSettings.updating"),
    });
  };

  return (
    <Tabs.Content value={"groups"} className={"w-full"}>
      <div className={"p-default py-6 max-w-xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("groupsSettings.title")}
            icon={<FolderGit2Icon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>{t("groupsSettings.title")}</h1>
          <Button
            variant={"primary"}
            disabled={!hasChanges}
            onClick={saveChanges}
          >
            {t("actions.saveChanges")}
          </Button>
        </div>

        <div className={"flex flex-col gap-6 mt-8 mb-3"}>
          <FancyToggleSwitch
            value={groupsPropagation}
            onChange={setGroupsPropagation}
            label={
              <>
                <FolderInput size={15} />
                {t("groupsSettings.enablePropagation")}
              </>
            }
            helpText={t("groupsSettings.enablePropagationHelp")}
            disabled={!permission.settings.update}
          />
          {(!isNetBirdHosted() || isLocalDev()) && (
            <FancyToggleSwitch
              value={jwtGroupSync}
              onChange={setJwtGroupSync}
              label={
                <>
                  <FolderSync size={15} />
                  {t("groupsSettings.enableJwtSync")}
                </>
              }
              helpText={t("groupsSettings.enableJwtSyncHelp")}
              disabled={!permission.settings.update}
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
                      <Label>{t("groupsSettings.jwtClaim")}</Label>
                      <HelpText>{t("groupsSettings.jwtClaimHelp")}</HelpText>
                      <Input
                        customPrefix={
                          <Braces size={16} className={"text-nb-gray-300"} />
                        }
                        onKeyDown={(event) => {
                          if (event.code === "Space") event.preventDefault();
                        }}
                        placeholder={t("groupsSettings.jwtClaimPlaceholder")}
                        value={jwtGroupsClaimName}
                        onChange={(e) => {
                          setJwtGroupsClaimName(
                            e.target.value.replace(/ /g, ""),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <Label>{t("groupsSettings.jwtAllowGroups")}</Label>
                      <HelpText>
                        {t("groupsSettings.jwtAllowGroupsHelp")}
                      </HelpText>
                      <div>
                        {jwtAllowGroups.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {jwtAllowGroups.map((group, index) => (
                              <Badge
                                key={group}
                                variant={"gray-ghost"}
                                className={cn(
                                  "transition-all group whitespace-nowrap cursor-pointer",
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  const newGroups = jwtAllowGroups.filter(
                                    (_, i) => i !== index,
                                  );
                                  setJwtAllowGroups(newGroups);
                                  setJwtAllowGroupsWarning(
                                    newGroups.length > 0,
                                  );
                                }}
                              >
                                {group}
                                <X
                                  size={12}
                                  className={
                                    "cursor-pointer group-hover:text-nb-gray-100 transition-all shrink-0"
                                  }
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Input
                          customPrefix={
                            <ShieldCheck
                              size={16}
                              className={"text-nb-gray-300"}
                            />
                          }
                          placeholder={t("groupsSettings.addGroupPlaceholder")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              if (input.value.trim()) {
                                setJwtAllowGroups([
                                  ...jwtAllowGroups,
                                  input.value.trim(),
                                ]);
                                setJwtAllowGroupsWarning(true);
                                input.value = "";
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    {jwtAllowGroupsWarning && (
                      <div
                        className={
                          "flex gap-2 items-center text-xs bg-netbird-950 px-4 justify-center py-3 rounded-md border border-netbird-500 text-netbird-200"
                        }
                      >
                        <AlertCircle size={14} />
                        {t("groupsSettings.accessWarning")}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        )}

        <Callout variant={"info"} className={"mt-6"}>
          {t("groupsSettings.manageGroupsPrefix")}{"  "}
          <InlineButtonLink
            onClick={() => router.push("/groups")}
            variant={"dashed"}
          >
            {t("groupsSettings.manageGroupsLink")}
          </InlineButtonLink>
        </Callout>
      </div>
    </Tabs.Content>
  );
}
