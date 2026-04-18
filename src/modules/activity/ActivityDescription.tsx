import FullTooltip from "@components/FullTooltip";
import { Label } from "@components/Label";
import { IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { isLocalDev, isProduction } from "@utils/netbird";
import { isEmpty } from "lodash";
import { GlobeIcon } from "lucide-react";
import React, { useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  event: ActivityEvent;
};

export default function ActivityDescription({ event }: Props) {
  const { t } = useI18n();
  const m = event.meta;
  const meta = useMemo(() => {
    if (event.meta) {
      return Object.keys(event.meta)
        .map((key) => {
          if (!event.meta[key]) return;
          if (key == "peer_groups") return;
          if (key.includes("id")) return;
          if (key.includes("time")) return;
          return {
            key,
            value: event.meta[key],
          };
        })
        .filter((item) => item !== undefined);
    }
  }, [event.meta]);

  if (!m) return null;

  /**
   * Setup Key
   */

  if (event.activity_code == "setupkey.revoke")
    return (
      <div className={"inline"}>
        Setup-Key <Value> {m.name}</Value> with key <Value>{m.key}</Value> {t("activity.setupkeyRevoke")}
      </div>
    );

  if (event.activity_code == "setupkey.delete")
    return (
      <div className={"inline"}>
        Setup-Key <Value> {m.name}</Value> with key <Value>{m.key}</Value> {t("activity.setupkeyDelete")}
      </div>
    );

  if (event.activity_code == "setupkey.add")
    return (
      <div className={"inline"}>
        Setup-Key <Value>{m.name}</Value> with key <Value>{m.key}</Value> {t("activity.setupkeyAdd")}
      </div>
    );

  if (event.activity_code == "peer.setupkey.add")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> was added
        with the NetBird IP <Value>{m.ip}</Value> using the setup key{" "}
        <Value>{m.setup_key_name}</Value>
      </div>
    );

  if (event.activity_code == "setupkey.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> {t("activity.setupkeyGroupDelete")}{" "}
        <Value>{m.setupkey}</Value> setup key
      </div>
    );

  if (event.activity_code == "setupkey.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> {t("activity.setupkeyGroupAdd")}{" "}
        <Value>{m.setupkey}</Value> setup key
      </div>
    );

  /**
   * Dashboard
   */
  if (event.activity_code == "dashboard.login")
    return (
      <div className={"inline"}>
        <Value>{m.username}</Value> {t("activity.dashboardLogin")}
      </div>
    );

  /**
   * Policy
   */

  if (event.activity_code == "policy.update")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> {t("activity.policyUpdate")}
      </div>
    );

  if (event.activity_code == "policy.delete")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> {t("activity.policyDelete")}
      </div>
    );

  if (event.activity_code == "policy.add")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> {t("activity.policyAdd")}
      </div>
    );

  /**
   * Route
   */

  if (event.activity_code == "route.delete") {
    let hasDomains = m?.domains && m?.domains.length > 0;
    return (
      <div className={"inline"}>
        Route <Value>{m.name}</Value> with the {hasDomains ? "domain(s)" : ""}{" "}
        <Value>{hasDomains ? m?.domains : m.network_range}</Value>{" "}
        {hasDomains ? "" : "range"} {t("activity.routeDelete")}
      </div>
    );
  }

  if (event.activity_code == "route.update") {
    let hasDomains = m?.domains && m?.domains.length > 0;
    return (
      <div className={"inline"}>
        Route <Value>{m.name}</Value> with the {hasDomains ? "domain(s)" : ""}{" "}
        <Value>{hasDomains ? m?.domains : m.network_range}</Value>{" "}
        {hasDomains ? "" : "range"} {t("activity.routeUpdate")}
      </div>
    );
  }

  if (event.activity_code == "route.add") {
    let hasDomains = m?.domains && m?.domains.length > 0;
    return (
      <div className={"inline"}>
        Route <Value>{m.name}</Value> with the {hasDomains ? "domain(s)" : ""}{" "}
        <Value>{hasDomains ? m?.domains : m.network_range}</Value>{" "}
        {hasDomains ? "" : "range"} {t("activity.routeAdd")}
      </div>
    );
  }

  /**
   * User
   */

  if (event.activity_code == "user.peer.delete")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> with
        NetBird IP <Value>{m.ip}</Value> {t("activity.userPeerDelete")}
      </div>
    );

  if (event.activity_code == "user.peer.add")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> {t("activity.userPeerAdd")}{" "}
        <Value>{m.ip}</Value>
      </div>
    );

  if (event.activity_code == "user.peer.update")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> with
        NetBird IP <Value>{m.ip}</Value> {t("activity.userPeerUpdate")}
      </div>
    );

  if (event.activity_code == "user.join")
    return (
      <div className={"inline"}>
        User <Value>{m.username}</Value> {t("activity.userJoin")}
      </div>
    );

  if (event.activity_code == "user.invite")
    return (
      <div className={"inline"}>
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value> {t("activity.userInvite")}
      </div>
    );

  if (event.activity_code == "user.create")
    return (
      <div className={"inline"}>
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value> {t("activity.userCreate")}{" "}
        <Value>{event?.initiator_name || "NetBird"}</Value>
      </div>
    );

  if (event.activity_code == "user.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> {t("activity.userGroupAdd")}{" "}
        <Value>{event.meta.username}</Value>
      </div>
    );

  if (event.activity_code == "user.block")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> {t("activity.userBlock")}
      </div>
    );

  if (event.activity_code == "user.unblock")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> {t("activity.userUnblock")}
      </div>
    );

  if (event.activity_code == "user.delete")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> {t("activity.userDelete")}
      </div>
    );

  if (event.activity_code == "user.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> {t("activity.userGroupDelete")}{" "}
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.role.update")
    return (
      <div className={"inline"}>
        Role <Value>{event.meta.role}</Value> {t("activity.userRoleUpdate")}{" "}
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.approve")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> {t("activity.userApprove")}
      </div>
    );

  if (event.activity_code == "user.reject")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> {t("activity.userReject")}
      </div>
    );

  if (event.activity_code == "user.password.change")
    return (
      <div className={"inline"}>
        {t("activity.userPasswordChange")} <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
      </div>
    );

  /**
   * User Invite Link
   */

  if (event.activity_code == "user.invite.link.create")
    return (
      <div className={"inline"}>
        {t("activity.userInviteLinkCreate")} <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.invite.link.accept")
    return (
      <div className={"inline"}>
        {t("activity.userInviteLinkAccept")} <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.invite.link.regenerate")
    return (
      <div className={"inline"}>
        {t("activity.userInviteLinkRegenerate")} <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.invite.link.delete")
    return (
      <div className={"inline"}>
        {t("activity.userInviteLinkDelete")} <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
      </div>
    );

  /**
   * Service User
   */

  if (event.activity_code == "service.user.create")
    return (
      <div className={"inline"}>
        Service user <Value>{event.meta.name}</Value> was created
      </div>
    );

  if (event.activity_code == "service.user.delete")
    return (
      <div className={"inline"}>
        Service user <Value>{event.meta.name}</Value> {t("activity.serviceUserDelete")}
      </div>
    );

  /**
   * Peer
   */

  if (event.activity_code == "peer.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> {t("activity.peerGroupDelete")} <Value>{m.peer_ip}</Value>
      </div>
    );

  if (event.activity_code == "peer.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> {t("activity.peerGroupAdd")} <Value>{m.peer_ip}</Value>
      </div>
    );

  if (event.activity_code == "peer.login.expire")
    return (
      <div className={"inline"}>
        {t("activity.peerLoginExpire")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.ssh.disable")
    return (
      <div className={"inline"}>
        SSH Server {t("activity.peerSshDisable")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.ssh.enable")
    return (
      <div className={"inline"}>
        SSH Server {t("activity.peerSshEnable")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.login.expiration.disable")
    return (
      <div className={"inline"}>
        {t("activity.peerLoginExpirationDisable")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.login.expiration.enable")
    return (
      <div className={"inline"}>
        {t("activity.peerLoginExpirationEnable")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.rename")
    return (
      <div className={"inline"}>
        Peer with the NetBird IP <Value>{m.ip}</Value> {t("activity.peerRename")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.approve")
    return (
      <div className={"inline"}>
        Peer with the NetBird IP <Value>{m.ip}</Value> {t("activity.peerApprove")}
      </div>
    );

  if (event.activity_code == "peer.ip.update")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> IP {t("activity.peerIpUpdate")} <Value>{m.old_ip}</Value> {t("activity.to")} <Value>{m.ip}</Value>
      </div>
    );

  if (event.activity_code == "peer.user.add")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> {t("activity.peerUserAdd")} <Value>{m.ip}</Value>
      </div>
    );

  /**
   * Group
   */

  if (event.activity_code == "group.add")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group_name}</Value> {t("activity.groupAdd")}
      </div>
    );

  if (event.activity_code == "group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group_name}</Value> {t("activity.groupDelete")}
      </div>
    );

  if (event.activity_code == "group.update")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.old_name}</Value> {t("activity.groupUpdate")} <Value>{event.meta.new_name}</Value>
      </div>
    );

  /**
   * Account
   */

  if (event.activity_code == "account.create")
    return (
      <div className={"inline"}>
        <Value>{event.initiator_name}</Value> {t("activity.accountCreate")}
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.update")
    return (
      <div className={"inline"}>
        {t("activity.globalLoginExpirationUpdated")}
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.enable")
    return (
      <div className={"inline"}>
        {t("activity.globalLoginExpirationEnabled")}
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.disable")
    return (
      <div className={"inline"}>
        {t("activity.globalLoginExpirationDisabled")}
      </div>
    );

  if (event.activity_code == "account.network.range.update")
    return (
      <div className={"inline"}>
        {t("activity.accountNetworkRangeUpdate")} <Value>{m.old_network_range}</Value> {t("activity.to")} <Value>{m.new_network_range}</Value>
      </div>
    );

  /**
   * Nameserver
   */

  if (event.activity_code == "nameserver.group.add")
    return (
      <div className={"inline"}>
        Nameserver <Value>{event.meta.name}</Value> {t("activity.nameserverGroupAdd")}
      </div>
    );

  if (event.activity_code == "nameserver.group.delete")
    return (
      <div className={"inline"}>
        Nameserver with IP <Value>{event.meta.ip}</Value> {t("activity.nameserverDelete")}
      </div>
    );

  if (event.activity_code == "nameserver.group.update")
    return (
      <div className={"inline"}>
        Nameserver with IP <Value>{event.meta.ip}</Value> {t("activity.nameserverUpdate")}
      </div>
    );

  /**
   * Personal Access Token
   */

  if (event.activity_code == "personal.access.token.create")
    return (
      <div className={"inline"}>
        Access token <Value>{event.meta.name}</Value> {t("activity.personalAccessTokenCreate")} <Value>{event.meta.username}</Value>
      </div>
    );

  if (event.activity_code == "personal.access.token.delete")
    return (
      <div className={"inline"}>
        Access token <Value>{event.meta.name}</Value> {t("activity.personalAccessTokenDelete")} <Value>{event.meta.username}</Value>
      </div>
    );

  /**
   * Integration
   */

  if (event.activity_code == "integration.create") {
    if (!event.meta.platform) return t("activity.integrationCreate");
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value> {t("activity.integrationCreate")}
      </div>
    );
  }

  if (event.activity_code == "integration.delete") {
    if (!event.meta.platform) return t("activity.integrationDelete");
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value> {t("activity.integrationDelete")}
      </div>
    );
  }

  if (event.activity_code == "integration.update") {
    if (!event.meta.platform) return t("activity.integrationUpdate");
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value> {t("activity.integrationUpdate")}
      </div>
    );
  }

  /**
   * DNS
   */

  if (event.activity_code == "dns.setting.disabled.management.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> {t("activity.dnsSettingDisabledManagementGroupAdd")}
      </div>
    );

  if (event.activity_code == "dns.setting.disabled.management.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> {t("activity.dnsSettingDisabledManagementGroupDelete")}
      </div>
    );

  /**
   * Posture Checks
   */

  if (event.activity_code == "posture.check.updated")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> {t("activity.postureCheckUpdated")}
      </div>
    );

  if (event.activity_code == "posture.check.created")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> {t("activity.postureCheckCreated")}
      </div>
    );

  if (event.activity_code == "posture.check.deleted")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> {t("activity.postureCheckDeleted")}
      </div>
    );

  if (event.activity_code == "transferred.owner.role")
    return <div className={"inline"}>{t("activity.ownerRoleTransferred")}</div>;

  /**
   * EDR
   */
  if (event.activity_code == "integrated-validator.api.created")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> {t("activity.integratedValidatorApiCreated")}
      </div>
    );

  if (event.activity_code == "integrated-validator.api.updated")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> {t("activity.integratedValidatorApiUpdated")}
      </div>
    );

  if (event.activity_code == "integrated-validator.api.deleted")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> {t("activity.integratedValidatorApiDeleted")}
      </div>
    );

  if (event.activity_code == "integrated-validator.host-check.approved")
    return (
      <div className={"inline"}>
        Peer {t("activity.integratedValidatorHostCheckApproved")} <Value>{m?.platform}</Value> integration
      </div>
    );

  if (event.activity_code == "integrated-validator.host-check.denied")
    return (
      <div className={"inline"}>
        Peer {t("activity.integratedValidatorHostCheckDenied")} <Value>{m?.platform}</Value> integration
      </div>
    );

  /**
   * Resource
   */
  if (event.activity_code == "resource.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.resource_name}</Value> {t("activity.resourceGroupAdd")} <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "resource.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{m.resource_name}</Value> {t("activity.resourceGroupDelete")} <Value>{m.name}</Value>
      </div>
    );

  /**
   * Reverse Proxy
   */

  if (event.activity_code == "service.peer.expose")
    return (
      <div className={"inline"}>
        Peer <Value>{m.peer_name}</Value> {t("activity.servicePeerExpose")} <Value>{m.domain}</Value> {t("activity.withAuth")} <Value>{m.auth ? t("activity.enabled") : t("activity.disabled")}</Value>
      </div>
    );

  if (event.activity_code == "service.peer.unexpose")
    return (
      <div className={"inline"}>
        Peer <Value>{m.peer_name}</Value> {t("activity.servicePeerUnexpose")} <Value>{m.domain}</Value>
      </div>
    );

  if (event.activity_code == "service.peer.expose.expire")
    return (
      <div className={"inline"}>
        Service <Value>{m.domain}</Value> {t("activity.servicePeerExposeExpire")} <Value>{m.peer_name}</Value>
      </div>
    );

  /**
   * Networks
   */

  if (event.activity_code == "network.resource.create")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> {t("activity.networkResourceCreate")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.resource.update")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> {t("activity.networkResourceUpdate")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.resource.delete")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> {t("activity.networkResourceDelete")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.create")
    return (
      <div className={"inline"}>
        {t("activity.networkRouterCreate")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.delete")
    return (
      <div className={"inline"}>
        {t("activity.networkRouterDelete")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.update")
    return (
      <div className={"inline"}>
        {t("activity.networkRouterUpdate")} <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.create")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> {t("activity.networkCreate")}
      </div>
    );

  if (event.activity_code == "network.delete")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> {t("activity.networkDelete")}
      </div>
    );

  if (event.activity_code == "network.update")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> {t("activity.networkUpdate")}
      </div>
    );

  /**
   * Jobs
   */

  if (event.activity_code == "peer.job.create")
    return (
      <div className={"inline"}>
        Remote job <Value>{m.job_type}</Value> {t("activity.peerJobCreate")} <Value>{m.for_peer_name}</Value>
      </div>
    );

  /**
   * Flow Settings
   */

  if (event.activity_code == "account.settings.extra.flow.group.remove")
    return (
      <div className={"inline"}>
        Limit traffic event group <Value>{m.group_name}</Value> {t("activity.accountSettingsFlowGroupRemove")}
      </div>
    );

  if (event.activity_code == "account.settings.extra.flow.group.add")
    return (
      <div className={"inline"}>
        Limit traffic event group <Value>{m.group_name}</Value> {t("activity.accountSettingsFlowGroupAdd")}
      </div>
    );

  /**
   * Identity Provider
   */

  if (event.activity_code == "identityprovider.create")
    return (
      <div className={"inline"}>
        Identity provider <Value>{m.name}</Value> {t("activity.identityProviderCreate")}
      </div>
    );

  if (event.activity_code == "identityprovider.update")
    return (
      <div className={"inline"}>
        Identity provider <Value>{m.name}</Value> {t("activity.identityProviderUpdate")}
      </div>
    );

  if (event.activity_code == "identityprovider.delete")
    return (
      <div className={"inline"}>
        Identity provider <Value>{m.name}</Value> {t("activity.identityProviderDelete")}
      </div>
    );

  return (
    <div className={"flex gap-2.5 items-center"}>
      <span className={"mb-[1px]"}>{event.activity}</span>

      {isLocalDev() && !isProduction() && (
        <FullTooltip
          content={
            <div className={"pb-1"}>
              <Label className={"mb-3"}>{t("activity.activityCode")}</Label>
              <Value>{event.activity_code}</Value>
              <Label className={"my-3"}>{t("activity.meta")}</Label>
              {meta &&
                meta.map((item) => (
                  <React.Fragment key={item?.key}>
                    <div className={"inline"}>
                      <Value>
                        {item?.key} = {item?.value}
                      </Value>
                    </div>
                  </React.Fragment>
                ))}
            </div>
          }
        >
          <IconInfoCircle className={"text-nb-gray-500"} size={16} />
        </FullTooltip>
      )}
    </div>
  );
}

function Value({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return children ? (
    <span
      className={cn(
        "text-nb-gray-200 inline-flex gap-1 items-center max-h-[22px] font-medium bg-nb-gray-900 py-[3px] text-[11px] px-[5px] border border-nb-gray-800 rounded-[4px]",
        className,
      )}
    >
      {children}
    </span>
  ) : null;
}

function PeerConnectionInfo({ meta }: { meta: any }) {
  const { t } = useI18n();
  const hasMeta =
    !isEmpty(meta?.location_country_code) ||
    !isEmpty(meta?.location_connection_ip);
  const { countries } = useCountries();

  const countryText = useMemo(() => {
    if (!countries) return t("common.unknown");
    const country = countries.find(
      (c) => c.country_code === meta?.location_country_code,
    );
    if (!country) return t("common.unknown");
    if (!meta?.location_city_name) return country.country_name;
    return `${country.country_name}, ${meta?.location_city_name}`;
  }, [countries, meta, t]);

  return hasMeta ? (
    <>
      {" "}
      from{" "}
      {meta?.location_connection_ip && (
        <Value>{meta?.location_connection_ip}</Value>
      )}{" "}
      {meta?.location_country_code && (
        <Value>
          {isEmpty(meta?.location_country_code) ? (
            <GlobeIcon size={9} className={"text-nb-gray-300"} />
          ) : (
            <RoundedFlag country={meta?.location_country_code} size={9} />
          )}
          {countryText}
        </Value>
      )}
    </>
  ) : null;
}
