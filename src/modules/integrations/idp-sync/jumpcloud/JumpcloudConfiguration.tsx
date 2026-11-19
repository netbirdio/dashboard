import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useHasChanges } from "@hooks/useHasChanges";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { trim } from "lodash";
import {
  AlertOctagon,
  Cog,
  FolderGit2,
  KeyRound,
  RefreshCcw,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/jumpcloud.png";
import { useDialog } from "@/contexts/DialogProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  IdentityProvider,
  ScimIntegration,
} from "@/interfaces/IdentityProvider";
import { EmbeddedIdentityProviderSelect } from "@/modules/integrations/idp-sync/EmbeddedIdentityProviderSelect";
import { GroupPrefixHelpText } from "@/modules/integrations/idp-sync/GroupPrefixHelpText";
import { GroupPrefixInput } from "@/modules/integrations/idp-sync/GroupPrefixInput";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function JumpcloudConfiguration({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { jumpcloud } = useIntegrations();

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        {jumpcloud && (
          <ConfigurationContent
            onSuccess={() => {
              onOpenChange(false);
              onSuccess && onSuccess();
            }}
            config={jumpcloud}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
  config: ScimIntegration;
};

export function ConfigurationContent({ onSuccess, config }: ModalProps) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("settings");

  const scimRequest = useApiCall<ScimIntegration>("/integrations/scim-idp");

  const [connectorId, setConnectorId] = useState(config.connector_id || "");
  const clientSecretPlaceholder = "******************************";
  const [authToken, setAuthToken] = useState(
    config.auth_token || clientSecretPlaceholder,
  );

  const [groupPrefixes, setGroupPrefixes] = useState<string[]>(
    config.group_prefixes || [],
  );
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>(
    config.user_group_prefixes || [],
  );

  const { hasChanges, updateRef } = useHasChanges([
    authToken,
    connectorId,
    groupPrefixes,
    userGroupPrefixes,
  ]);

  const regenerateAuthToken = async () => {
    const choice = await confirm({
      title: t("integrations.idpRegenerateAuthTokenTitle"),
      description: t("integrations.idpJumpcloudRegenerateDesc"),
      confirmText: t("integrations.regenerateButton"),
      cancelText: t("common.cancel"),
      type: "default",
    });

    if (!choice) return;

    notify({
      title: t("integrations.idpIntegrationTitle", {
        name: t("integrations.idpJumpcloud"),
      }),
      description: t("integrations.idpRegeneratedDescription", {
        name: t("integrations.idpJumpcloud"),
      }),
      promise: scimRequest.post({}, `/${config.id}/token`).then((r) => {
        mutate("/integrations/scim-idp");
        setAuthToken(r.auth_token);
        updateRef([r.auth_token, groupPrefixes, userGroupPrefixes]);
      }),
      loadingMessage: t("integrations.idpUpdatingAuthToken"),
    });
  };

  const deleteIntegration = async () => {
    const choice = await confirm({
      title: t("integrations.idpDeleteIntegrationTitle"),
      description: t("integrations.idpConfirmDeleteDesc"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: t("integrations.idpIntegrationTitle", {
        name: t("integrations.idpJumpcloud"),
      }),
      description: t("integrations.idpDeletedDescription", {
        name: t("integrations.idpJumpcloud"),
      }),
      promise: scimRequest.del({}, `/${config.id}`).then(() => {
        mutate("/integrations/scim-idp");
        onSuccess();
      }),
      loadingMessage: t("integrations.idpDeletingLoading"),
    });
  };

  const updateIntegration = async () => {
    notify({
      title: t("integrations.idpIntegrationTitle", {
        name: t("integrations.idpJumpcloud"),
      }),
      description: t("integrations.idpUpdatedDescription", {
        name: t("integrations.idpJumpcloud"),
      }),
      promise: scimRequest
        .put(
          {
            group_prefixes: groupPrefixes
              ? groupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            user_group_prefixes: userGroupPrefixes
              ? userGroupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            provider: IdentityProvider.JUMPCLOUD,
            ...(connectorId ? { connector_id: connectorId } : {}),
          },
          `/${config.id}`,
        )
        .then(() => {
          mutate("/integrations/scim-idp");
          onSuccess();
        }),
      loadingMessage: t("integrations.idpUpdatingLoading"),
    });
  };

  return (
    <ModalContent
      maxWidthClass={cn("relative max-w-xl")}
      showClose={true}
      className={""}
      autoFocus={false}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={integrationImage}
        title={t("integrations.idpConfigurationTitle", {
          name: t("integrations.idpJumpcloud"),
        })}
        description={t("integrations.idpJumpcloudConfigDescription")}
      />

      <Tabs
        defaultValue={tab}
        onValueChange={(v) => setTab(v)}
        className={"mt-6"}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"settings"}>
            <Cog
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.settings")}
          </TabsTrigger>
          <TabsTrigger value={"group-sync"}>
            <FolderGit2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.groupSync")}
          </TabsTrigger>
          <TabsTrigger value={"user-sync"}>
            <UserCircle
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.userSync")}
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("common.dangerZoneTitle")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"settings"} className={"px-8 text-sm"}>
          <div className={"flex-col gap-3 flex"}>
            <Card className={"w-full"}>
              <Card.List>
                <Card.ListItem
                  copy={!authToken.includes("*")}
                  copyText={t("integrations.idpAuthTokenCopy")}
                  label={
                    <>
                      <KeyRound size={16} />
                      {t("integrations.idpAuthToken")}
                    </>
                  }
                  value={authToken}
                />
              </Card.List>
            </Card>
            <Button variant={"secondary"} onClick={regenerateAuthToken}>
              <RefreshCcw size={16} />
              {t("integrations.idpRegenerateAuthToken")}
            </Button>
            <EmbeddedIdentityProviderSelect
              value={connectorId}
              onChange={setConnectorId}
              location="settings"
            />
          </div>
        </TabsContent>

        <TabsContent value={"group-sync"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <FolderGit2 size={16} />
                {t("common.syncGroups")}
              </div>
            </Label>
            <GroupPrefixHelpText />
          </div>
          <GroupPrefixInput value={groupPrefixes} onChange={setGroupPrefixes} />
        </TabsContent>

        <TabsContent value={"user-sync"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <UserCircle size={16} />
                {t("common.syncUsers")}
              </div>
            </Label>
            <GroupPrefixHelpText type={"user-groups"} />
          </div>
          <GroupPrefixInput
            addText={t("integrations.idpAddUserGroupFilter")}
            text={t("integrations.idpUserGroupStartsWith")}
            value={userGroupPrefixes}
            onChange={setUserGroupPrefixes}
          />
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={16} />
                {t("common.deleteIntegration")}
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              {t("integrations.idpDeleteWarning")}
            </HelpText>
          </div>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={deleteIntegration}
          >
            {t("common.deleteIntegration")}
          </Button>
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>

      <ModalFooter className={"items-center gap-4"}>
        <ModalClose asChild={true}>
          <Button variant={"secondary"} className={"w-full"}>
            {t("common.cancel")}
          </Button>
        </ModalClose>

        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={!hasChanges}
          onClick={updateIntegration}
        >
          {t("common.save")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
