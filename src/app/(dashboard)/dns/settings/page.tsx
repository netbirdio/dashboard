"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { IconSettings2 } from "@tabler/icons-react";
import useFetchApi, { useApiCall } from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { NameserverSettings } from "@/interfaces/NameserverSettings";
import PageContainer from "@/layouts/PageContainer";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroupIdsToGroups } from "@/modules/groups/useGroupIdsToGroups";

export default function NameServerSettings() {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { data: settings, isLoading } =
    useFetchApi<NameserverSettings>("/dns/settings");

  const initialDNSGroups = useGroupIdsToGroups(
    settings?.disabled_management_groups,
  );

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/dns"}
            label={t("dns.title")}
            icon={<DNSIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/dns/settings"}
            label={t("nav.dnsSettings")}
            active
            icon={<IconSettings2 size={15} />}
          />
        </Breadcrumbs>
        <h1>{t("dnsSettingsPage.title")}</h1>
        <Paragraph>{t("dnsSettingsPage.description")}</Paragraph>
        <Paragraph>
          {t("common.learnMorePrefix")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/manage-dns-in-your-network"}
            target={"_blank"}
          >
            {t("dns.title")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {" "}{t("common.inDocumentationSuffix")}
        </Paragraph>
        <RestrictedAccess
          page={t("nav.dnsSettings")}
          hasAccess={permission.dns.read}
        >
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
  const settingRequest = useApiCall<NameserverSettings>("/dns/settings");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { t } = useI18n();

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
      title: t("dnsSettingsPage.title"),
      description: t("dnsSettingsPage.saved"),
      promise: settingRequest
        .put({
          disabled_management_groups: savedGroups.map((g) => g.id),
        })
        .then(() => {
          mutate("/dns/settings");
          updateChangesRef([selectedGroups]);
        }),
      loadingMessage: t("dnsSettingsPage.saving"),
    });
  };

  return (
    <Card className={"mt-8 max-w-xl"}>
      <div className={"px-8 py-8"}>
        <Label>{t("dnsSettingsPage.disableManagementLabel")}</Label>
        <HelpText>{t("dnsSettingsPage.disableManagementHelp")}</HelpText>
        <PeerGroupSelector
          dataCy={"dns-groups-selector"}
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
          data-cy={"save-changes"}
        >
          {t("actions.saveChanges")}
        </Button>
      </div>
    </Card>
  );
};
