"use client";

import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi, { useApiCall } from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";
import { NameserverSettings } from "@/interfaces/NameserverSettings";
import PageContainer from "@/layouts/PageContainer";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroupIdsToGroups } from "@/modules/groups/useGroupIdsToGroups";

export default function NameServerSettings() {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { data: settings, isLoading } =
    useFetchApi<NameserverSettings>("/dns/settings");

  const initialDNSGroups = useGroupIdsToGroups(
    settings?.disabled_management_groups,
  );

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <h1>{t("common.dnsSettings")}</h1>
        <Paragraph>
          {t("dns.dnsSettingsDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-dns-in-your-network"}
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
        <RestrictedAccess page={t("common.dnsSettings")} hasAccess={permission.dns.read}>
          {!isLoading && initialDNSGroups !== undefined ? (
            <SettingDisabledManagementGroups initialGroups={initialDNSGroups} />
          ) : (
            <div>
              <Skeleton
                width={"100%"}
                className={"mt-8 max-w-xl"}
                height={240}
              />
            </div>
          )}
        </RestrictedAccess>
      </div>
    </PageContainer>
  );
}

const SettingDisabledManagementGroups = ({
  initialGroups,
}: {
  initialGroups: Group[];
}) => {
  const translate = useTranslations();
  const settingRequest = useApiCall<NameserverSettings>("/dns/settings");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: initialGroups,
    });

  const { hasChanges, updateRef: updateChangesRef } = useHasChanges([
    selectedGroups,
  ]);

  const saveSettings = async () => {
    const savedGroups = await saveGroups();
    notify({
      title: translate("common.dnsSettings"),
      description: translate("dns.settingsSaved"),
      promise: settingRequest
        .put({
          disabled_management_groups: savedGroups.map((g) => g.id),
        })
        .then(() => {
          mutate("/dns/settings");
          updateChangesRef([selectedGroups]);
        }),
      loadingMessage: translate("dns.settingsSaving"),
    });
  };

  return (
    <Card className={"mt-8 max-w-xl"}>
      <div className={"px-8 py-8"}>
        <Label>{translate("dns.disabledManagementGroup")}</Label>
        <HelpText>
          {translate("dns.disabledManagementGroupHelp")}
        </HelpText>
        <PeerGroupSelector
          data-testid={"dns-groups-selector"}
          onChange={setSelectedGroups}
          values={selectedGroups}
          disabled={!permission.dns.update}
        />
      </div>
      <div
        className={
          "flex justify-end bg-nb-gray-900/20 border-t border-nb-gray-900 px-8 py-5"
        }
      >
        <Button
          variant={"primary"}
          size={"sm"}
          onClick={saveSettings}
          disabled={!hasChanges || !permission.dns.update}
          data-testid={"save-changes"}
        >
          {translate("common.saveChanges")}
        </Button>
      </div>
    </Card>
  );
};
