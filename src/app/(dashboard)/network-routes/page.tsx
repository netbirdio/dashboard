"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { ArrowUpRightIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { lazy, Suspense } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";
import PageContainer from "@/layouts/PageContainer";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";
import { Callout } from "@components/Callout";

const NetworkRoutesTable = lazy(
	() => import("@/modules/route-group/NetworkRoutesTable"),
);

export default function NetworkRoutes() {
	const t = useTranslations("networks");
	const tCommon = useTranslations("common");
	const { permission } = usePermissions();
	const { data: routes, isLoading } = useFetchApi<Route[]>("/routes");
	const groupedRoutes = useGroupedRoutes({ routes });

	const { ref: headingRef, portalTarget } =
		usePortalElement<HTMLHeadingElement>();

	return (
		<PageContainer>
			<RoutesProvider>
				<PeersProvider>
					<div className={"p-default py-6"}>
						<Breadcrumbs>
							<Breadcrumbs.Item
								label={t("networkRoutes")}
								icon={<NetworkRoutesIcon size={13} />}
							/>
							<Breadcrumbs.Item href={"/network-routes"} label={t("routes")} />
						</Breadcrumbs>
						<h1 ref={headingRef}>{t("routes")}</h1>
						<Paragraph>
							{t("routesDescription")}{" "}
							<InlineLink
								href={
									"https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
								}
								target={"_blank"}

							>
								<>{tCommon("learnMore")}</>
								<ExternalLinkIcon size={12} />
							</InlineLink>
						</Paragraph>

						<Callout className={"max-w-xl mt-5"} variant={"warning"}>
							<span>
								{t("newNetworksRecommendation")}{" "}
								<InlineLink href={"/networks"}>
									{t("goToNetworks")}
									<ArrowUpRightIcon size={14} />
								</InlineLink>
							</span>
						</Callout>
					</div>

					<RestrictedAccess hasAccess={permission.routes.read}>
						<Suspense fallback={<SkeletonTable />}>
							<NetworkRoutesTable
								isLoading={isLoading}
								groupedRoutes={groupedRoutes}
								routes={routes}
								headingTarget={portalTarget}
							/>
						</Suspense>
					</RestrictedAccess>
				</PeersProvider>
			</RoutesProvider>
		</PageContainer>
	);
}
