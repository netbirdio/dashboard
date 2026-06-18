"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { lazy, Suspense } from "react";
import DNSIcon from "@/assets/icons/DNSIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";
import PageContainer from "@/layouts/PageContainer";

const NameserverGroupTable = lazy(
	() => import("@/modules/dns/nameservers/table/NameserverGroupTable"),
);

export default function NameServers() {
	const t = useTranslations("dns");
	const tCommon = useTranslations("common");
	const { permission } = usePermissions();

	const { data: nameserverGroups, isLoading } =
		useFetchApi<NameserverGroup[]>("/dns/nameservers");

	const { ref: headingRef, portalTarget } =
		usePortalElement<HTMLHeadingElement>();

	return (
		<PageContainer>
			<div className={"p-default py-6"}>
				<Breadcrumbs>
					<Breadcrumbs.Item
						href={"/dns/nameservers"}
						label={t("title")}
						icon={<DNSIcon size={13} />}
					/>
					<Breadcrumbs.Item
						href={"/dns/nameservers"}
						label={t("nameservers")}
						active
						icon={<DNSIcon size={13} />}
					/>
				</Breadcrumbs>
				<h1 ref={headingRef}>{t("nameservers")}</h1>
				<Paragraph>
					{t("nameserversDescription")}{" "}
					<InlineLink
						href={"https://docs.netbird.io/how-to/manage-dns-in-your-network"}
						target={"_blank"}
					>
						{tCommon("learnMore")}
						<ExternalLinkIcon size={12} />
					</InlineLink>
				</Paragraph>
			</div>

			<RestrictedAccess
				page={t("nameservers")}
				hasAccess={permission.nameservers.read}
			>
				<Suspense fallback={<SkeletonTable />}>
					<NameserverGroupTable
						nameserverGroups={nameserverGroups}
						isLoading={isLoading}
						headingTarget={portalTarget}
					/>
				</Suspense>
			</RestrictedAccess>
		</PageContainer>
	);
}
