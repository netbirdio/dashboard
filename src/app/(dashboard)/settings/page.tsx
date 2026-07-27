"use client";

import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { VerticalTabs } from "@components/VerticalTabs";
import {
	AlertOctagonIcon,
	ChartNoAxesCombined,
	FingerprintIcon,
	FolderGit2Icon,
	KeyRound,
	LanguagesIcon,
	LockIcon,
	MonitorSmartphoneIcon,
	NetworkIcon,
	ShieldIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import {
	CloudSettingsTabContent,
	CloudSettingsTabTrigger,
} from "@/cloud/settings/CloudSettings";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { useAccount } from "@/modules/account/useAccount";
import AuthenticationTab from "@/modules/settings/AuthenticationTab";
import ClientSettingsTab from "@/modules/settings/ClientSettingsTab";
import DangerZoneTab from "@/modules/settings/DangerZoneTab";
import IdentityProvidersTab from "@/modules/settings/IdentityProvidersTab";
import LanguageTab from "@/modules/settings/LanguageTab";
import MetricsTab from "@/modules/settings/MetricsTab";
import NetworkSettingsTab from "@/modules/settings/NetworkSettingsTab";
import PermissionsTab from "@/modules/settings/PermissionsTab";
import SetupKeysTab from "@/modules/settings/SetupKeysTab";
import GroupsSettings from "@/modules/settings/GroupsSettings";

export default function NetBirdSettings() {
	const t = useTranslations("settings");
	const queryParams = useSearchParams();
	const queryTab = queryParams.get("tab");
	const { permission } = usePermissions();

	const initialTab = useMemo(() => {
		if (permission?.settings?.read) return "authentication";
		if (permission?.billing?.update) return "plans-and-billing";
		return "authentication";
	}, [permission]);

	const [tab, setTab] = useState(queryTab ?? initialTab);

	const account = useAccount();

	useEffect(() => {
		if (queryTab) {
			setTab(queryTab);
		}
	}, [queryTab]);

	return (
		<PageContainer>
			<VerticalTabs value={tab} onChange={setTab}>
				<VerticalTabs.List>
					{permission.settings.read && (
						<>
							<VerticalTabs.Trigger value="authentication" data-testid="settings-tab-authentication">
								<ShieldIcon size={14} />
								{t("authentication")}
							</VerticalTabs.Trigger>
							{permission.setup_keys.read && (
								<VerticalTabs.Trigger value="setup-keys">
									<KeyRound size={14} />
									{t("setupKeys")}
								</VerticalTabs.Trigger>
							)}
							{account?.settings?.embedded_idp_enabled &&
								permission?.identity_providers?.read && (
									<VerticalTabs.Trigger value="identity-providers">
										<FingerprintIcon size={14} />
										{t("identityProviders")}
									</VerticalTabs.Trigger>
								)}
							<VerticalTabs.Trigger value="groups" data-testid="settings-tab-groups">
								<FolderGit2Icon size={14} />
								{t("groupsTab")}
							</VerticalTabs.Trigger>
							<VerticalTabs.Trigger value="permissions" data-testid="settings-tab-permissions">
								<LockIcon size={14} />
								{t("permissions")}
							</VerticalTabs.Trigger>
							<VerticalTabs.Trigger value="networks" data-testid="settings-tab-networks">
								<NetworkIcon size={14} />
								{t("networksTab")}
							</VerticalTabs.Trigger>
							<VerticalTabs.Trigger value="clients" data-testid="settings-tab-clients">
								<MonitorSmartphoneIcon size={14} />
								{t("clients")}
							</VerticalTabs.Trigger>
							<VerticalTabs.Trigger value="language" data-testid="settings-tab-language">
								<LanguagesIcon size={14} />
								{t("language")}
							</VerticalTabs.Trigger>
							<VerticalTabs.Trigger value="metrics" data-testid="settings-tab-metrics">
								<ChartNoAxesCombined size={14} />
								{t("metrics")}
							</VerticalTabs.Trigger>
						</>
					)}

					<CloudSettingsTabTrigger />
					<DangerZoneTabTrigger />
				</VerticalTabs.List>
				<RestrictedAccess
					page={t("title")}
					hasAccess={permission?.billing?.read || permission?.settings?.read}
				>
					<div className={"border-l border-nb-gray-930 w-full"}>
						{account && <AuthenticationTab account={account} />}
						{permission.setup_keys.read && <SetupKeysTab />}
						{account?.settings?.embedded_idp_enabled &&
							permission.identity_providers.read && <IdentityProvidersTab />}
						{account && <PermissionsTab account={account} />}
						{account && <GroupsSettings account={account} />}
						{account && <NetworkSettingsTab account={account} />}
						{account && <ClientSettingsTab account={account} />}
						<LanguageTab />
						{account && <MetricsTab account={account} />}
						{account && <DangerZoneTab account={account} />}
						<CloudSettingsTabContent />
					</div>
				</RestrictedAccess>
			</VerticalTabs>
		</PageContainer>
	);
}

const DangerZoneTabTrigger = () => {
	const t = useTranslations("settings");
	const { isOwner } = useLoggedInUser();
	const { isAccountWithMSPParent } = useMSP();
	if (isAccountWithMSPParent) return;

	return (
		isOwner && (
			<VerticalTabs.Trigger value="danger-zone" disabled={!isOwner}>
				<AlertOctagonIcon size={14} />
				{t("dangerZone")}
			</VerticalTabs.Trigger>
		)
	);
};
