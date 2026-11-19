import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
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
  Box,
  Cog,
  Folder,
  FolderGit2,
  KeyRound,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/entra-id.png";
import { useDialog } from "@/contexts/DialogProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { AzureADIntegration } from "@/interfaces/IdentityProvider";
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

export default function AzureADConfiguration({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { azure } = useIntegrations();

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        {azure && (
          <ConfigurationContent
            onSuccess={() => {
              onOpenChange(false);
              onSuccess && onSuccess();
            }}
            config={azure}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
  config: AzureADIntegration;
};

export function ConfigurationContent({ onSuccess, config }: ModalProps) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [tab, setTab] = useState<string>("settings");

  const azureRequest = useApiCall<AzureADIntegration>(
    "/integrations/azure-idp",
  );

  const clientSecretPlaceholder = "******************************";
  const [clientSecret, setClientSecret] = useState(clientSecretPlaceholder);

  const [connectorId, setConnectorId] = useState(config.connector_id || "");
  const [clientId, setClientId] = useState(config.client_id);
  const [tenantId, setTenantId] = useState(config.tenant_id);
  const [interval, setInterval] = useState(config.sync_interval.toString());

  const [groupPrefixes, setGroupPrefixes] = useState<string[]>(
    config.group_prefixes || [],
  );
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>(
    config.user_group_prefixes || [],
  );

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
        name: t("integrations.idpEntraIdApi"),
      }),
      description: t("integrations.idpDeletedDescription", {
        name: t("integrations.idpEntraIdApi"),
      }),
      promise: azureRequest.del({}, `/${config.id}`).then(() => {
        mutate("/integrations/azure-idp");
        onSuccess();
      }),
      loadingMessage: t("integrations.idpDeletingLoading"),
    });
  };

  const updateIntegration = async () => {
    notify({
      title: t("integrations.idpIntegrationTitle", {
        name: t("integrations.idpEntraIdApi"),
      }),
      description: t("integrations.idpUpdatedDescription", {
        name: t("integrations.idpEntraIdApi"),
      }),
      promise: azureRequest
        .put(
          {
            client_id: clientId,
            tenant_id: tenantId,
            client_secret:
              clientSecretPlaceholder == clientSecret
                ? undefined
                : btoa(clientSecret),
            sync_interval: interval ? parseInt(interval) : 300,
            group_prefixes: groupPrefixes
              ? groupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            user_group_prefixes: userGroupPrefixes
              ? userGroupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            ...(connectorId ? { connector_id: connectorId } : {}),
          },
          `/${config.id}`,
        )
        .then(() => {
          mutate("/integrations/azure-idp");
          onSuccess();
        }),
      loadingMessage: t("integrations.idpUpdatingLoading"),
    });
  };

  const { hasChanges } = useHasChanges([
    clientId,
    tenantId,
    clientSecret,
    interval,
    connectorId,
    groupPrefixes,
    userGroupPrefixes,
  ]);

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
          name: t("integrations.idpEntraIdApi"),
        })}
        description={t("integrations.idpEntraConfigDescription")}
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
            <Input
              type={"text"}
              autoCorrect={"off"}
              autoComplete={"off"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <Box size={16} />
                  {t("integrations.idpApplicationClientId")}
                </div>
              }
              placeholder={"62d3a656-c87d-4f30-a242-5b6347e29e9f"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              autoCorrect={"off"}
              autoComplete={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <Folder size={16} />
                  {t("integrations.idpDirectoryTenantId")}
                </div>
              }
              placeholder={"5d60468a-65b7-45eb-a61a-53ecfbcd1ea3"}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />

            <Input
              autoCorrect={"off"}
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <KeyRound size={16} />
                  {t("integrations.idpClientSecret")}
                </div>
              }
              placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />

            <div className={"flex justify-between mt-4"}>
              <div>
                <Label>{t("integrations.idpSyncInterval")}</Label>
                <HelpText className={"max-w-[300px]"}>
                  {t("integrations.idpSyncIntervalHelp")}
                </HelpText>
              </div>
              <Input
                maxWidthClass={"max-w-[400px]"}
                placeholder={"300"}
                min={1}
                max={99999}
                value={interval}
                type={"number"}
                onChange={(e) => setInterval(e.target.value)}
                customPrefix={
                  <RefreshCw size={16} className={"text-nb-gray-300"} />
                }
                customSuffix={t("integrations.idpSyncIntervalUnit")}
              />
            </div>
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
