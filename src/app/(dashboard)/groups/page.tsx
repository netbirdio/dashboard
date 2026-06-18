"use client";

import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon, FolderGit2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { lazy, Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import InlineLink from "@/components/InlineLink";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PageContainer from "@/layouts/PageContainer";

const GroupsTable = lazy(() => import("@/modules/groups/table/GroupsTable"));

export default function GroupsPage() {
	const t = useTranslations("groups");
	const { permission } = usePermissions();
	const { ref: headingRef, portalTarget } =
		usePortalElement<HTMLHeadingElement>();

	return (
		<PageContainer>
			<div className={"p-default py-6"}>
				<Breadcrumbs>
					<Breadcrumbs.Item
						href={"/groups"}
						label={t("title")}
						icon={<FolderGit2Icon size={14} />}
						active
					/>
				</Breadcrumbs>
				<h1 ref={headingRef}>{t("title")}</h1>
				<Paragraph>
					{t("groupsDescription")}{" "}
					<InlineLink
						href={"https://docs.netbird.io/how-to/manage-network-access"}
						target={"_blank"}
					>
						{t("learnMore")}
						<ExternalLinkIcon size={12} />
					</InlineLink>
				</Paragraph>
			</div>
			<RestrictedAccess hasAccess={permission.groups.read} page={t("title")}>
				<Suspense fallback={<SkeletonTable />}>
					<GroupsTable headingTarget={portalTarget} />
				</Suspense>
			</RestrictedAccess>
		</PageContainer>
	);
}
