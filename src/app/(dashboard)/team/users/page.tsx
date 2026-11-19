"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, User2 } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { AccountMfaCard } from "@/cloud/mfa/AccountMFACard";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import { IdentityProviderCard } from "@/modules/integrations/idp-sync/IdentityProviderCard";
import UsersTabs from "@/modules/users/UsersTabs";

const UsersTable = lazy(() => import("@/modules/users/UsersTable"));

export default function TeamUsers() {
  const t = useTranslations();
  const { isLoading: isGroupsLoading } = useGroups();
  const { permission } = usePermissions();
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team/users"}
            label={t("common.users")}
            active
            icon={<User2 size={16} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>{t("common.users")}</h1>
        <Paragraph>
          {t("team.usersPageDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/add-users-to-your-network"}
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <UsersTabs current={"users"} />
      <RestrictedAccess page={t("common.users")} hasAccess={permission.users.read}>
        <Suspense fallback={<SkeletonTable />}>
          {permission.settings.read && (
            <div className={"flex flex-wrap gap-4 p-default pb-6"}>
              {(permission?.idp?.read || !isNetBirdCloud()) && (
                <IdentityProviderCard />
              )}
              <AccountMfaCard />
            </div>
          )}
          <UsersTable
            users={users}
            isLoading={isLoading || isGroupsLoading}
            headingTarget={portalTarget}
          />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
