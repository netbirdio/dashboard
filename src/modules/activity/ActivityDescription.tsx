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

type Props = {
  event: ActivityEvent;
};

export default function ActivityDescription({ event }: Props) {
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
        Setup-Key <Value>{m.name}</Value> with key <Value>{m.key}</Value> was
        created
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
        Group <Value>{m.group}</Value> was removed from the{" "}
        <Value>{m.setupkey}</Value> setup key
      </div>
    );

  if (event.activity_code == "setupkey.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> was added to the{" "}
        <Value>{m.setupkey}</Value> setup key
      </div>
    );

  /**
   * Dashboard
   */
  if (event.activity_code == "dashboard.login")
    return (
      <div className={"inline"}>
        <Value>{m.username}</Value> logged in to the dashboard
      </div>
    );

  /**
   * Policy
   */

  if (event.activity_code == "policy.update")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> has been updated
      </div>
    );

  if (event.activity_code == "policy.delete")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> was deleted
      </div>
    );

  if (event.activity_code == "policy.add")
    return (
      <div className={"inline"}>
        Policy <Value>{m.name}</Value> was created
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
        User <Value>{m.username}</Value> joined NetBird
      </div>
    );

  if (event.activity_code == "user.invite")
    return (
      <div className={"inline"}>
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>{" "}
        was invited.
      </div>
    );

  if (event.activity_code == "user.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> was added to user{" "}
        <Value>{event.meta.username}</Value>
      </div>
    );

  if (event.activity_code == "user.block")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
        was blocked
      </div>
    );

  if (event.activity_code == "user.unblock")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value>
        was unblocked
      </div>
    );

  if (event.activity_code == "user.delete")
    return (
      <div className={"inline"}>
        User <Value>{event.meta.username}</Value>{" "}
        <Value>{event.meta.email}</Value> was deleted
      </div>
    );

  if (event.activity_code == "user.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> was removed from user{" "}
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>
      </div>
    );

  if (event.activity_code == "user.role.update")
    return (
      <div className={"inline"}>
        Role <Value>{event.meta.role}</Value> was updated of user{" "}
        <Value>{event.meta.username}</Value> <Value>{event.meta.email}</Value>
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
        Service user <Value>{event.meta.name}</Value> was deleted
      </div>
    );

  /**
   * Peer
   */

  if (event.activity_code == "peer.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> was removed from the peer with the
        NetBird IP <Value>{m.peer_ip}</Value>
      </div>
    );

  if (event.activity_code == "peer.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.group}</Value> was added to the peer with the NetBird IP{" "}
        <Value>{m.peer_ip}</Value>
      </div>
    );

  if (event.activity_code == "peer.login.expire")
    return (
      <div className={"inline"}>
        Login of the peer <Value>{m.name}</Value> is expired
      </div>
    );

  if (event.activity_code == "peer.ssh.disable")
    return (
      <div className={"inline"}>
        SSH Server of peer <Value>{m.name}</Value> was disabled
      </div>
    );

  if (event.activity_code == "peer.ssh.enable")
    return (
      <div className={"inline"}>
        SSH Server of peer <Value>{m.name}</Value> was enabled
      </div>
    );

  if (event.activity_code == "peer.login.expiration.disable")
    return (
      <div className={"inline"}>
        Login expiration of peer <Value>{m.name}</Value> was disabled
      </div>
    );

  if (event.activity_code == "peer.login.expiration.enable")
    return (
      <div className={"inline"}>
        Login expiration of peer <Value>{m.name}</Value> was enabled
      </div>
    );

  if (event.activity_code == "peer.rename")
    return (
      <div className={"inline"}>
        Peer with the NetBird IP <Value>{m.ip}</Value> was renamed to{" "}
        <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "peer.approve")
    return (
      <div className={"inline"}>
        Peer with the NetBird IP <Value>{m.ip}</Value> was approved
      </div>
    );

  if (event.activity_code == "peer.ip.update")
    return (
      <div className={"inline"}>
        Peer <Value>{m.name}</Value> IP address was updated from{" "}
        <Value>{m.old_ip}</Value> to <Value>{m.ip}</Value>
      </div>
    );

  /**
   * Group
   */

  if (event.activity_code == "group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.name}</Value> was created
      </div>
    );

  if (event.activity_code == "group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.name}</Value> was deleted
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
    return <div className={"inline"}>Global login expiration was updated</div>;

  if (event.activity_code == "account.setting.peer.login.expiration.enable")
    return <div className={"inline"}>Global login expiration was enabled</div>;

  if (event.activity_code == "account.setting.peer.login.expiration.disable")
    return <div className={"inline"}>Global login expiration was disabled</div>;

  if (event.activity_code == "account.network.range.update")
    return (
      <div className={"inline"}>
        Account network range was updated from{" "}
        <Value>{m.old_network_range}</Value> to{" "}
        <Value>{m.new_network_range}</Value>
      </div>
    );

  /**
   * Nameserver
   */

  if (event.activity_code == "nameserver.group.add")
    return (
      <div className={"inline"}>
        Nameserver <Value>{event.meta.name}</Value> was added
      </div>
    );

  if (event.activity_code == "nameserver.group.delete")
    return (
      <div className={"inline"}>
        Nameserver <Value>{event.meta.name}</Value> was deleted
      </div>
    );

  if (event.activity_code == "nameserver.group.update")
    return (
      <div className={"inline"}>
        Nameserver <Value>{event.meta.name}</Value> was updated
      </div>
    );

  /**
   * Personal Access Token
   */

  if (event.activity_code == "personal.access.token.create")
    return (
      <div className={"inline"}>
        Access token <Value>{event.meta.name}</Value> for user{" "}
        <Value>{event.meta.username}</Value> was created
      </div>
    );

  if (event.activity_code == "personal.access.token.delete")
    return (
      <div className={"inline"}>
        Access token <Value>{event.meta.name}</Value> for user{" "}
        <Value>{event.meta.username}</Value> was deleted
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

  /**
   * DNS
   */

  if (event.activity_code == "dns.setting.disabled.management.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> was added to disabled DNS group
        setting
      </div>
    );

  if (event.activity_code == "dns.setting.disabled.management.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{event.meta.group}</Value> was removed from disabled DNS
        group setting
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
    return <div className={"inline"}>Owner role was transferred</div>;

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

  /**
   * Resource
   */
  if (event.activity_code == "resource.group.add")
    return (
      <div className={"inline"}>
        Group <Value>{m.resource_name}</Value> added to resource{"  "}
        <Value>{m.name}</Value>
      </div>
    );

  if (event.activity_code == "resource.group.delete")
    return (
      <div className={"inline"}>
        Group <Value>{m.resource_name}</Value> removed from resource{"  "}
        <Value>{m.name}</Value>
      </div>
    );

  /**
   * Networks
   */

  if (event.activity_code == "network.resource.create")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> created for network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.resource.update")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> updated for network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.resource.delete")
    return (
      <div className={"inline"}>
        Resource <Value>{m.name}</Value> deleted from network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.create")
    return (
      <div className={"inline"}>
        Routing peer created for network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.delete")
    return (
      <div className={"inline"}>
        Routing peer deleted from network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.router.update")
    return (
      <div className={"inline"}>
        Routing peer updated from network{"  "}
        <Value>{m.network_name}</Value>
      </div>
    );

  if (event.activity_code == "network.create")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> created
      </div>
    );

  if (event.activity_code == "network.delete")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> deleted
      </div>
    );

  if (event.activity_code == "network.update")
    return (
      <div className={"inline"}>
        Network with name <Value>{m.name}</Value> updated
      </div>
    );

  /**
   * Jobs
   */

  if (event.activity_code == "peer.job.create")
    return (<div className={"inline"}>
      Remote job <Value>{m.job_type}</Value> created for peer <Value>{m.for_peer_name}</Value>
    </div>
    )

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
