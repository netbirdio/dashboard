"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { lazy, Suspense, useMemo } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useBypassedPeers } from "@/cloud/edr/useBypass";
import useDistributorRedirect from "@/cloud/distributor/useDistributorRedirect";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function UserDevicesPage() {
const { isRestricted } = usePermissions();
	const { isLoading: isDistributorRedirecting } = useDistributorRedirect();
	if (isDistributorRedirecting) return <FullScreenLoading />;

	return (
		<PageContainer>
			{isRestricted ? (
				<UserDevicesBlockedView />
			) : (
				<PeersProvider>
					<UserDevicesView />
				</PeersProvider>
			)}
		</PageContainer>
	);
}

function UserDevicesView() {
const t = useTranslations("peers");
	const { peers, isLoading: isPeersLoading } = usePeers();
	const { users, isLoading: isUsersLoading } = useUsers();
	const { isBypassed } = useBypassedPeers();
	const { ref: headingRef, portalTarget } =
		usePortalElement<HTMLHeadingElement>();

	// The kind filter classifies peers by whether their owner is a real
	// user vs a service/no-user, so we must wait until both peers and
	// users have loaded before joining them — otherwise peers temporarily
	// render with peer.user === undefined and get misclassified.
	const isLoading = isPeersLoading || isUsersLoading;
	const peersWithUser = useMemo(() => {
		if (!peers || !users) return undefined;
		return peers.map((peer) => ({
			...peer,
			user: users.find((u) => u.id === peer.user_id),
			force_approved: peer.id ? isBypassed(peer.id) : false,
		}));
	}, [peers, users, isBypassed]);

	return (
		<>
			<div className={"p-default py-6"}>
				<Breadcrumbs>
					<Breadcrumbs.Item label={t("title")} icon={<PeerIcon size={13} />} />
					<Breadcrumbs.Item
						href={"/peers/users"}
						label={t("userDevices")}
						active
					/>
				</Breadcrumbs>
				<h1 ref={headingRef}>{t("userDevices")}</h1>
				<Paragraph>
					{t("userDevicesDescription")}{" "}
					<InlineLink
						href={"https://docs.netbird.io/how-to/add-machines-to-your-network"}
						target={"_blank"}
					>
						{t("learnMore")}
						<ExternalLinkIcon size={12} />
					</InlineLink>
				</Paragraph>
			</div>
			<Suspense fallback={<SkeletonTable />}>
				<PeersTable
					isLoading={isLoading}
					peers={peersWithUser}
					headingTarget={portalTarget}
					kind={"users"}
				/>
			</Suspense>
		</>
	);
}

function UserDevicesBlockedView() {
	const t = useTranslations("peers");
	return (
		<div className={"flex items-center justify-center flex-col"}>
			<div className={"p-default py-6 max-w-3xl text-center"}>
				<h1>{t("addNewDeviceTitle")}</h1>
				<Paragraph className={"inline"}>
					{t("addNewDeviceDescription")}{" "}
					<InlineLink
						href={"https://docs.netbird.io/how-to/getting-started#installation"}
						target={"_blank"}
					>
						{t("installationGuide")}
						<ExternalLinkIcon size={12} />
					</InlineLink>
				</Paragraph>
			</div>
			<div className={"px-3 pt-1 pb-8 max-w-3xl w-full"}>
				<div
					className={
						"rounded-md border border-nb-gray-900/70 grid w-full bg-nb-gray-930/40 stepper-bg-variant"
					}
				>
					<SetupModalContent header={false} footer={false} isUserDevice />
				</div>
			</div>
		</div>
	);
}
