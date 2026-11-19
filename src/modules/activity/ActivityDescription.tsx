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
import { useTranslations } from "@/i18n/LocaleProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";

type Props = {
  event: ActivityEvent;
};

export default function ActivityDescription({ event }: Props) {
  const t = useTranslations();
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
        Setup-Key <Value> {m.name}</Value> with key <Value>{m.key}</Value> was
        revoked
      </div>
    );

  if (event.activity_code == "setupkey.delete")
    return (
      <div className={"inline"}>
        Setup-Key <Value> {m.name}</Value> with key <Value>{m.key}</Value> was
        deleted
      </div>
    );

  if (event.activity_code == "setupkey.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.setupkeyAdd", {
          name: m.name ?? "",
          Value: highlightValue,
          key: m.key ?? "",
        })}
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
        {t.rich("activity.setupkeyGroupDelete", {
          group: m.group ?? "",
          Value: highlightValue,
          setupkey: m.setupkey ?? "",
        })}
      </div>
    );

  if (event.activity_code == "setupkey.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.setupkeyGroupAdd", {
          group: m.group ?? "",
          Value: highlightValue,
          setupkey: m.setupkey ?? "",
        })}
      </div>
    );

  /**
   * Dashboard
   */
  if (event.activity_code == "dashboard.login")
    return (
      <div className={"inline"}>
        {t.rich("activity.dashboardLogin", {
          username: m.username ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Policy
   */

  if (event.activity_code == "policy.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.policyUpdate", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "policy.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.policyDelete", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "policy.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.policyAdd", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
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
        {hasDomains ? "" : "range"} was deleted
      </div>
    );
  }

  if (event.activity_code == "route.update") {
    let hasDomains = m?.domains && m?.domains.length > 0;
    return (
      <div className={"inline"}>
        Route <Value>{m.name}</Value> with the {hasDomains ? "domain(s)" : ""}{" "}
        <Value>{hasDomains ? m?.domains : m.network_range}</Value>{" "}
        {hasDomains ? "" : "range"} was updated
      </div>
    );
  }

  if (event.activity_code == "route.add") {
    let hasDomains = m?.domains && m?.domains.length > 0;
    return (
      <div className={"inline"}>
        Route <Value>{m.name}</Value> with the {hasDomains ? "domain(s)" : ""}{" "}
        <Value>{hasDomains ? m?.domains : m.network_range}</Value>{" "}
        {hasDomains ? "" : "range"} was created
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
        NetBird IP <Value>{m.ip}</Value> was deleted
      </div>
    );

  if (event.activity_code == "user.peer.add")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> was added
        with the NetBird IP <Value>{m.ip}</Value>
      </div>
    );

  if (event.activity_code == "user.peer.update")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> with
        NetBird IP <Value>{m.ip}</Value> was updated
      </div>
    );

  if (event.activity_code == "user.join")
    return (
      <div className={"inline"}>
        {t.rich("activity.userJoin", {
          username: m.username ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "user.invite")
    return (
      <div className={"inline"}>
        {t.rich("activity.userInvite", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.create")
    return (
      <div className={"inline"}>
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>{" "}
        was created by <Value>{event?.initiator_name || "NetBird"}</Value>
      </div>
    );

  if (event.activity_code == "user.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.userGroupAdd", {
          group: event.meta.group ?? "",
          Value: highlightValue,
          username: event.meta.username ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.block")
    return (
      <div className={"inline"}>
        {t.rich("activity.userBlock", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.unblock")
    return (
      <div className={"inline"}>
        {t.rich("activity.userUnblock", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.userDelete", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.userGroupDelete", {
          group: event.meta.group ?? "",
          Value: highlightValue,
          username: event.meta.username ?? "",
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.role.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.userRoleUpdate", {
          role: event.meta.role ?? "",
          Value: highlightValue,
          username: event.meta.username ?? "",
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.approve")
    return (
      <div className={"inline"}>
        {t.rich("activity.userApprove", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.reject")
    return (
      <div className={"inline"}>
        {t.rich("activity.userReject", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.password.change")
    return (
      <div className={"inline"}>
        {t.rich("activity.userPasswordChange", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  /**
   * User Invite Link
   */

  if (event.activity_code == "user.invite.link.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.userInviteLinkCreate", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.invite.link.accept")
    return (
      <div className={"inline"}>
        {t.rich("activity.userInviteLinkAccept", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.invite.link.regenerate")
    return (
      <div className={"inline"}>
        {t.rich("activity.userInviteLinkRegenerate", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  if (event.activity_code == "user.invite.link.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.userInviteLinkDelete", {
          username: event.meta.username ?? "",
          Value: highlightValue,
          email: event.meta.email ?? "",
        })}
      </div>
    );

  /**
   * Service User
   */

  if (event.activity_code == "service.user.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.serviceUserCreate", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "service.user.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.serviceUserDelete", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Peer
   */

  if (event.activity_code == "peer.group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerGroupDelete", {
          group: m.group ?? "",
          Value: highlightValue,
          peer_ip: m.peer_ip ?? "",
        })}
      </div>
    );

  if (event.activity_code == "peer.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerGroupAdd", {
          group: m.group ?? "",
          Value: highlightValue,
          peer_ip: m.peer_ip ?? "",
        })}
      </div>
    );

  if (event.activity_code == "peer.login.expire") {
    return (
      <div className={"inline"}>
        Login of the peer <Value>{m.name}</Value> expired
        {m.reason && (
          <>
            {" "}
            due to <Value>{m.reason}</Value>
          </>
        )}
      </div>
    );
  }

  if (event.activity_code == "peer.ssh.disable")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerSshDisable", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "peer.ssh.enable")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerSshEnable", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "peer.login.expiration.disable")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerLoginExpirationDisable", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "peer.login.expiration.enable")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerLoginExpirationEnable", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "peer.rename")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerRename", {
          ip: m.ip ?? "",
          Value: highlightValue,
          name: m.name ?? "",
        })}
      </div>
    );

  if (event.activity_code == "peer.approve")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerApprove", {
          ip: m.ip ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "peer.ip.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerIpUpdate", {
          name: m.name ?? "",
          Value: highlightValue,
          old_ip: m.old_ip ?? "",
          ip: m.ip ?? "",
        })}
      </div>
    );

  if (event.activity_code == "peer.user.add")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> <PeerConnectionInfo meta={m} /> was added
        with the NetBird IP <Value>{m.ip}</Value>
      </div>
    );

  /**
   * Group
   */

  if (event.activity_code == "group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.groupAdd", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.groupDelete", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "group.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.groupUpdate", {
          old_name: event.meta.old_name ?? "",
          Value: highlightValue,
          new_name: event.meta.new_name ?? "",
        })}
      </div>
    );

  /**
   * Account
   */

  if (event.activity_code == "account.create")
    return (
      <div className={"inline"}>
        <Value>{event.initiator_name}</Value> created an account
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.update")
    return (
      <div className={"inline"}>
        {t("activity.accountSettingPeerLoginExpirationUpdate")}
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.enable")
    return (
      <div className={"inline"}>
        {t("activity.accountSettingPeerLoginExpirationEnable")}
      </div>
    );

  if (event.activity_code == "account.setting.peer.login.expiration.disable")
    return (
      <div className={"inline"}>
        {t("activity.accountSettingPeerLoginExpirationDisable")}
      </div>
    );

  if (event.activity_code == "account.network.range.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.accountNetworkRangeUpdate", {
          old_network_range: m.old_network_range ?? "",
          Value: highlightValue,
          new_network_range: m.new_network_range ?? "",
        })}
      </div>
    );

  /**
   * Nameserver
   */

  if (event.activity_code == "nameserver.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.nameserverGroupAdd", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "nameserver.group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.nameserverGroupDelete", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "nameserver.group.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.nameserverGroupUpdate", {
          name: event.meta.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Personal Access Token
   */

  if (event.activity_code == "personal.access.token.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.personalAccessTokenCreate", {
          name: event.meta.name ?? "",
          Value: highlightValue,
          username: event.meta.username ?? "",
        })}
      </div>
    );

  if (event.activity_code == "personal.access.token.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.personalAccessTokenDelete", {
          name: event.meta.name ?? "",
          Value: highlightValue,
          username: event.meta.username ?? "",
        })}
      </div>
    );

  /**
   * Integration
   */

  if (event.activity_code == "integration.create") {
    if (!event.meta.platform) return "Integration created";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration created
      </div>
    );
  }

  if (event.activity_code == "integration.delete") {
    if (!event.meta.platform) return "Integration deleted";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration deleted
      </div>
    );
  }

  if (event.activity_code == "integration.update") {
    if (!event.meta.platform) return "Integration updated";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration updated
      </div>
    );
  }

  if (event.activity_code == "integration.enable") {
    if (!event.meta.platform) return "Integration enabled";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration enabled
      </div>
    );
  }

  if (event.activity_code == "integration.disable") {
    if (!event.meta.platform) return "Integration disabled";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration disabled
      </div>
    );
  }

  if (event.activity_code == "integration.disable-by-system") {
    if (!event.meta.platform) return "Integration disabled by system";
    return (
      <div className={"inline"}>
        <Value className={"capitalize"}>{event.meta.platform}</Value>{" "}
        integration disabled by system
        {event.meta.reason && (
          <>
            {" "}
            due to <Value>{event.meta.reason}</Value>
          </>
        )}
      </div>
    );
  }

  /**
   * DNS
   */

  if (event.activity_code == "dns.setting.disabled.management.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.dnsSettingDisabledManagementGroupAdd", {
          group: event.meta.group ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "dns.setting.disabled.management.group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.dnsSettingDisabledManagementGroupDelete", {
          group: event.meta.group ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Posture Checks
   */

  if (event.activity_code == "posture.check.updated")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> was updated
      </div>
    );

  if (event.activity_code == "posture.check.created")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> was created
      </div>
    );

  if (event.activity_code == "posture.check.deleted")
    return (
      <div className={"inline"}>
        Posture check <Value> {m.name}</Value> was deleted
      </div>
    );

  if (event.activity_code == "transferred.owner.role")
    return <div className={"inline"}>{t("activity.transferredOwnerRole")}</div>;

  /**
   * EDR
   */
  if (event.activity_code == "integrated-validator.api.created")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration created
      </div>
    );

  if (event.activity_code == "integrated-validator.api.updated")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration updated
      </div>
    );

  if (event.activity_code == "integrated-validator.api.deleted")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration deleted
      </div>
    );

  if (event.activity_code == "integrated-validator.api.enabled")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration enabled
      </div>
    );

  if (event.activity_code == "integrated-validator.api.disabled")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration disabled
      </div>
    );

  if (event.activity_code == "integrated-validator.api.disabled-by-system")
    return (
      <div className={"inline"}>
        <Value>{m?.platform}</Value> integration disabled by system
        {m?.reason && (
          <>
            {" "}
            due to <Value>{m.reason}</Value>
          </>
        )}
      </div>
    );

  if (event.activity_code == "integrated-validator.host-check.approved")
    return (
      <div className={"inline"}>
        Peer approved by <Value>{m?.platform}</Value> integration
      </div>
    );

  if (event.activity_code == "integrated-validator.host-check.denied")
    return (
      <div className={"inline"}>
        Peer rejected by <Value>{m?.platform}</Value> integration
      </div>
    );

  if (event.activity_code == "integrated-validator.peer.compliance-bypassed")
    return (
      <div className={"inline"}>
        Peer <Value>{m?.name}</Value> with the NetBird IP <Value>{m?.ip}</Value>{" "}
        compliance bypassed for <Value>{m?.platform}</Value> integration
        {m?.original_reason && (
          <>
            {" "}
            (original non-compliant reason: <Value>{m?.original_reason}</Value>)
          </>
        )}
      </div>
    );

  if (
    event.activity_code == "integrated-validator.peer.compliance-bypass-revoked"
  )
    return (
      <div className={"inline"}>
        Peer <Value>{m?.name}</Value> with the NetBird IP <Value>{m?.ip}</Value>{" "}
        compliance bypass revoked for <Value>{m?.platform}</Value> integration
      </div>
    );

  /**
   * Resource
   */
  if (event.activity_code == "resource.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.resourceGroupAdd", {
          name: m.name ?? "",
          Value: highlightValue,
          resource_name: m.resource_name ?? "",
        })}
      </div>
    );

  if (event.activity_code == "resource.group.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.resourceGroupDelete", {
          name: m.name ?? "",
          Value: highlightValue,
          resource_name: m.resource_name ?? "",
        })}
      </div>
    );

  /**
   * Reverse Proxy
   */

  if (event.activity_code == "service.peer.expose")
    return (
      <div className={"inline"}>
        Peer <Value>{m.peer_name}</Value> exposed service{" "}
        <Value>{m.domain}</Value> with auth{" "}
        <Value>{m.auth ? "Enabled" : "Disabled"}</Value>
      </div>
    );

  if (event.activity_code == "service.peer.unexpose")
    return (
      <div className={"inline"}>
        {t.rich("activity.servicePeerUnexpose", {
          peer_name: m.peer_name ?? "",
          Value: highlightValue,
          domain: m.domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "service.peer.expose.expire")
    return (
      <div className={"inline"}>
        {t.rich("activity.servicePeerExposeExpire", {
          domain: m.domain ?? "",
          Value: highlightValue,
          peer_name: m.peer_name ?? "",
        })}
      </div>
    );

  /**
   * Networks
   */

  if (event.activity_code == "network.resource.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkResourceCreate", {
          name: m.name ?? "",
          Value: highlightValue,
          network_name: m.network_name ?? "",
        })}
      </div>
    );

  if (event.activity_code == "network.resource.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkResourceUpdate", {
          name: m.name ?? "",
          Value: highlightValue,
          network_name: m.network_name ?? "",
        })}
      </div>
    );

  if (event.activity_code == "network.resource.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkResourceDelete", {
          name: m.name ?? "",
          Value: highlightValue,
          network_name: m.network_name ?? "",
        })}
      </div>
    );

  if (event.activity_code == "network.router.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkRouterCreate", {
          network_name: m.network_name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "network.router.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkRouterDelete", {
          network_name: m.network_name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "network.router.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkRouterUpdate", {
          network_name: m.network_name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "network.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkCreate", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "network.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkDelete", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "network.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.networkUpdate", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Jobs
   */

  if (event.activity_code == "peer.job.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.peerJobCreate", {
          job_type: m.job_type ?? "",
          Value: highlightValue,
          for_peer_name: m.for_peer_name ?? "",
        })}
      </div>
    );

  /**
   * Flow Settings
   */

  if (event.activity_code == "account.settings.extra.flow.group.remove")
    return (
      <div className={"inline"}>
        {t.rich("activity.accountSettingsExtraFlowGroupRemove", {
          group_name: m.group_name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "account.settings.extra.flow.group.add")
    return (
      <div className={"inline"}>
        {t.rich("activity.accountSettingsExtraFlowGroupAdd", {
          group_name: m.group_name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Identity Provider
   */

  if (event.activity_code == "identityprovider.create")
    return (
      <div className={"inline"}>
        {t.rich("activity.identityproviderCreate", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "identityprovider.update")
    return (
      <div className={"inline"}>
        {t.rich("activity.identityproviderUpdate", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  if (event.activity_code == "identityprovider.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.identityproviderDelete", {
          name: m.name ?? "",
          Value: highlightValue,
        })}
      </div>
    );

  /**
   * Reverse Proxy
   */

  if (event.activity_code == "service.create")
    return (
      <div className={"inline"}>
        Service <Value>{m.domain}</Value> in cluster{" "}
        <Value>{m.proxy_cluster}</Value> was created with authentication{" "}
        <Value>{m.auth ? "Enabled" : "Disabled"}</Value>
      </div>
    );

  if (event.activity_code == "service.update")
    return (
      <div className={"inline"}>
        Service <Value>{m.domain}</Value> in cluster{" "}
        <Value>{m.proxy_cluster}</Value> was updated with authentication{" "}
        <Value>{m.auth ? "Enabled" : "Disabled"}</Value>
      </div>
    );

  if (event.activity_code == "service.delete")
    return (
      <div className={"inline"}>
        {t.rich("activity.serviceDelete", {
          domain: m.domain ?? "",
          Value: highlightValue,
          proxy_cluster: m.proxy_cluster ?? "",
        })}
      </div>
    );

  /**
   * Distributor
   */

  if (event.activity_code == "reseller.msp.created")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspCreated", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.activated")
    return <div className={"inline"}>{t("activity.resellerActivated")}</div>;

  if (event.activity_code == "reseller.msp.deleted")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspDeleted", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.msp.unlinked")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspUnlinked", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.msp.invite.requested")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspInviteRequested", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.msp.invite.accepted")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspInviteAccepted", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.msp.invite.declined")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspInviteDeclined", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  if (event.activity_code == "reseller.msp.updated")
    return (
      <div className={"inline"}>
        {t.rich("activity.resellerMspUpdated", {
          msp_name: m.msp_name ?? "",
          Value: highlightValue,
          msp_domain: m.msp_domain ?? "",
        })}
      </div>
    );

  return (
    <div className={"flex gap-2.5 items-center"}>
      <span className={"mb-[1px]"}>{event.activity}</span>

      {isLocalDev() && !isProduction() && (
        <FullTooltip
          content={
            <div className={"pb-1"}>
              <Label className={"mb-3"}>Activity Code</Label>
              <Value>{event.activity_code}</Value>
              <Label className={"my-3"}>Meta</Label>
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

function highlightValue(chunks: React.ReactNode) {
  return <Value>{chunks}</Value>;
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
  const hasMeta =
    !isEmpty(meta?.location_country_code) ||
    !isEmpty(meta?.location_connection_ip);
  const { countries } = useCountries();

  const countryText = useMemo(() => {
    if (!countries) return "Unknown";
    const country = countries.find(
      (c) => c.country_code === meta?.location_country_code,
    );
    if (!country) return "Unknown";
    if (!meta?.location_city_name) return country.country_name;
    return `${country.country_name}, ${meta?.location_city_name}`;
  }, [countries, meta]);

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
