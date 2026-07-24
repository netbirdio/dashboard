import FullTooltip from "@components/FullTooltip";
import { Label } from "@components/Label";
import { IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { isLocalDev, isProduction } from "@utils/netbird";
import { isEmpty } from "lodash";
import { GlobeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import { ActivityEvent } from "@/interfaces/ActivityEvent";

type Props = {
	event: ActivityEvent;
};

export default function ActivityDescription({ event }: Props) {
	const t = useTranslations("activity");
	const tCommon = useTranslations("common");
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
				{t.rich("desc_setupkey_revoke", {
					name: m.name,
					key: m.key,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "setupkey.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_setupkey_delete", {
					name: m.name,
					key: m.key,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "setupkey.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_setupkey_add", {
					name: m.name,
					key: m.key,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.setupkey.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_setupkey_add", {
					name: m.name,
					ip: m.ip,
					setup_key_name: m.setup_key_name,
					peerConnectionInfo: () => <PeerConnectionInfo meta={m} />,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "setupkey.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_setupkey_group_delete", {
					group: m.group,
					setupkey: m.setupkey,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "setupkey.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_setupkey_group_add", {
					group: m.group,
					setupkey: m.setupkey,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Dashboard
	 */
	if (event.activity_code == "dashboard.login")
		return (
			<div className={"inline"}>
				{t.rich("desc_dashboard_login", {
					username: m.username,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Policy
	 */

	if (event.activity_code == "policy.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_policy_update", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "policy.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_policy_delete", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "policy.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_policy_add", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Route
	 */

	if (event.activity_code == "route.delete") {
		let hasDomains = m?.domains && m?.domains.length > 0;
		let descKey = hasDomains
			? "desc_route_delete_domains"
			: "desc_route_delete_range";
		return (
			<div className={"inline"}>
				{t.rich(descKey, {
					name: m.name,
					domains: m?.domains,
					network_range: m.network_range,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);
	}

	if (event.activity_code == "route.update") {
		let hasDomains = m?.domains && m?.domains.length > 0;
		let descKey = hasDomains
			? "desc_route_update_domains"
			: "desc_route_update_range";
		return (
			<div className={"inline"}>
				{t.rich(descKey, {
					name: m.name,
					domains: m?.domains,
					network_range: m.network_range,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);
	}

	if (event.activity_code == "route.add") {
		let hasDomains = m?.domains && m?.domains.length > 0;
		let descKey = hasDomains
			? "desc_route_add_domains"
			: "desc_route_add_range";
		return (
			<div className={"inline"}>
				{t.rich(descKey, {
					name: m.name,
					domains: m?.domains,
					network_range: m.network_range,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);
	}

	/**
	 * User
	 */

	if (event.activity_code == "user.peer.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_peer_delete", {
					name: m.name,
					ip: m.ip,
					peerConnectionInfo: () => <PeerConnectionInfo meta={m} />,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.peer.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_peer_add", {
					name: m.name,
					ip: m.ip,
					peerConnectionInfo: () => <PeerConnectionInfo meta={m} />,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.peer.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_peer_update", {
					name: m.name,
					ip: m.ip,
					peerConnectionInfo: () => <PeerConnectionInfo meta={m} />,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.join")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_join", {
					username: m.username,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.invite")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_invite", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_create", {
					username: event.meta.username,
					email: event.meta.email,
					initiator: event?.initiator_name || "NetBird",
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_group_add", {
					group: event.meta.group,
					username: event.meta.username,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.block")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_block", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.unblock")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_unblock", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_delete", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_group_delete", {
					group: event.meta.group,
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.role.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_role_update", {
					role: event.meta.role,
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.approve")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_approve", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.reject")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_reject", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.password.change")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_password_change", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * User Invite Link
	 */

	if (event.activity_code == "user.invite.link.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_invite_link_create", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.invite.link.accept")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_invite_link_accept", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.invite.link.regenerate")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_invite_link_regenerate", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "user.invite.link.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_user_invite_link_delete", {
					username: event.meta.username,
					email: event.meta.email,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Service User
	 */

	if (event.activity_code == "service.user.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_user_create", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "service.user.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_user_delete", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Peer
	 */

	if (event.activity_code == "peer.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_group_delete", {
					group: m.group,
					peer_ip: m.peer_ip,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_group_add", {
					group: m.group,
					peer_ip: m.peer_ip,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.login.expire")
		return (
			<div className={"inline"}>
        {m.reason
          ? t.rich("desc_peer_login_expire_with_reason", {
              name: m.name,
              reason: m.reason,
              Value: (chunks) => <Value>{chunks}</Value>,
            })
          : t.rich("desc_peer_login_expire", {
              name: m.name,
              Value: (chunks) => <Value>{chunks}</Value>,
            })}
			</div>
		);

	if (event.activity_code == "peer.ssh.disable")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_ssh_disable", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.ssh.enable")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_ssh_enable", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.login.expiration.disable")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_login_expiration_disable", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.login.expiration.enable")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_login_expiration_enable", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.rename")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_rename", {
					ip: m.ip,
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.approve")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_approve", {
					ip: m.ip,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.ip.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_ip_update", {
					name: m.name,
					old_ip: m.old_ip,
					ip: m.ip,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "peer.user.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_user_add", {
					name: m.name,
					ip: m.ip,
					peerConnectionInfo: () => <PeerConnectionInfo meta={m} />,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Group
	 */

	if (event.activity_code == "group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_group_add", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_group_delete", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "group.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_group_update", {
					old_name: event.meta.old_name,
					new_name: event.meta.new_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Account
	 */

	if (event.activity_code == "account.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_account_create", {
					initiator: event.initiator_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "account.setting.peer.login.expiration.update")
		return (
			<div className={"inline"}>
				{t("desc_account_setting_peer_login_expiration_update")}
			</div>
		);

	if (event.activity_code == "account.setting.peer.login.expiration.enable")
		return (
			<div className={"inline"}>
				{t("desc_account_setting_peer_login_expiration_enable")}
			</div>
		);

	if (event.activity_code == "account.setting.peer.login.expiration.disable")
		return (
			<div className={"inline"}>
				{t("desc_account_setting_peer_login_expiration_disable")}
			</div>
		);

	if (event.activity_code == "account.network.range.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_account_network_range_update", {
					old_network_range: m.old_network_range,
					new_network_range: m.new_network_range,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Nameserver
	 */

	if (event.activity_code == "nameserver.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_nameserver_group_add", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "nameserver.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_nameserver_group_delete", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "nameserver.group.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_nameserver_group_update", {
					name: event.meta.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Personal Access Token
	 */

	if (event.activity_code == "personal.access.token.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_personal_access_token_create", {
					name: event.meta.name,
					username: event.meta.username,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "personal.access.token.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_personal_access_token_delete", {
					name: event.meta.name,
					username: event.meta.username,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Integration
	 */

	if (event.activity_code == "integration.create") {
		if (!event.meta.platform)
			return <div className={"inline"}>{t("desc_integration_create")}</div>;
		return (
			<div className={"inline"}>
				{t.rich("desc_integration_create_platform", {
					platform: event.meta.platform,
					Value: (chunks) => <Value className={"capitalize"}>{chunks}</Value>,
				})}
			</div>
		);
	}

	if (event.activity_code == "integration.delete") {
		if (!event.meta.platform)
			return <div className={"inline"}>{t("desc_integration_delete")}</div>;
		return (
			<div className={"inline"}>
				{t.rich("desc_integration_delete_platform", {
					platform: event.meta.platform,
					Value: (chunks) => <Value className={"capitalize"}>{chunks}</Value>,
				})}
			</div>
		);
	}

	if (event.activity_code == "integration.update") {
		if (!event.meta.platform)
			return <div className={"inline"}>{t("desc_integration_update")}</div>;
		return (
			<div className={"inline"}>
				{t.rich("desc_integration_update_platform", {
					platform: event.meta.platform,
					Value: (chunks) => <Value className={"capitalize"}>{chunks}</Value>,
				})}
			</div>
		);
	}

	/**
	 * DNS
	 */

	if (event.activity_code == "dns.setting.disabled.management.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_dns_setting_disabled_management_group_add", {
					group: event.meta.group,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "dns.setting.disabled.management.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_dns_setting_disabled_management_group_delete", {
					group: event.meta.group,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Posture Checks
	 */

	if (event.activity_code == "posture.check.updated")
		return (
			<div className={"inline"}>
				{t.rich("desc_posture_check_updated", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "posture.check.created")
		return (
			<div className={"inline"}>
				{t.rich("desc_posture_check_created", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "posture.check.deleted")
		return (
			<div className={"inline"}>
				{t.rich("desc_posture_check_deleted", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "transferred.owner.role")
		return <div className={"inline"}>{t("desc_transferred_owner_role")}</div>;

	/**
	 * EDR
	 */
	if (event.activity_code == "integrated-validator.api.created")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_api_created", {
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "integrated-validator.api.updated")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_api_updated", {
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "integrated-validator.api.deleted")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_api_deleted", {
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "integrated-validator.host-check.approved")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_host_check_approved", {
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "integrated-validator.host-check.denied")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_host_check_denied", {
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "integrated-validator.peer.compliance-bypassed")
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_peer_compliance_bypassed", {
					name: m?.name,
					ip: m?.ip,
					platform: m?.platform,
					original_reason: m?.original_reason
						? ` (original non-compliant reason: ${m.original_reason})`
						: "",
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (
		event.activity_code == "integrated-validator.peer.compliance-bypass-revoked"
	)
		return (
			<div className={"inline"}>
				{t.rich("desc_integrated_validator_peer_compliance_bypass_revoked", {
					name: m?.name,
					ip: m?.ip,
					platform: m?.platform,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Resource
	 */
	if (event.activity_code == "resource.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_resource_group_add", {
					resource_name: m.resource_name,
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "resource.group.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_resource_group_delete", {
					resource_name: m.resource_name,
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Reverse Proxy
	 */

	if (event.activity_code == "service.peer.expose")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_peer_expose", {
					peer_name: m.peer_name,
					domain: m.domain,
					auth: m.auth ? tCommon("enabled") : tCommon("disabled"),
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "service.peer.unexpose")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_peer_unexpose", {
					peer_name: m.peer_name,
					domain: m.domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "service.peer.expose.expire")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_peer_expose_expire", {
					domain: m.domain,
					peer_name: m.peer_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Networks
	 */

	if (event.activity_code == "network.resource.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_resource_create", {
					name: m.name,
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.resource.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_resource_update", {
					name: m.name,
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.resource.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_resource_delete", {
					name: m.name,
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.router.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_router_create", {
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.router.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_router_delete", {
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.router.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_router_update", {
					network_name: m.network_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_create", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_delete", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "network.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_network_update", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Jobs
	 */

	if (event.activity_code == "peer.job.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_peer_job_create", {
					job_type: m.job_type,
					for_peer_name: m.for_peer_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Flow Settings
	 */

	if (event.activity_code == "account.settings.extra.flow.group.remove")
		return (
			<div className={"inline"}>
				{t.rich("desc_account_settings_extra_flow_group_remove", {
					group_name: m.group_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "account.settings.extra.flow.group.add")
		return (
			<div className={"inline"}>
				{t.rich("desc_account_settings_extra_flow_group_add", {
					group_name: m.group_name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Identity Provider
	 */

	if (event.activity_code == "identityprovider.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_identityprovider_create", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "identityprovider.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_identityprovider_update", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "identityprovider.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_identityprovider_delete", {
					name: m.name,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Reverse Proxy
	 */

	if (event.activity_code == "service.create")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_create", {
					domain: m.domain,
					proxy_cluster: m.proxy_cluster,
					auth: m.auth ? tCommon("enabled") : tCommon("disabled"),
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "service.update")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_update", {
					domain: m.domain,
					proxy_cluster: m.proxy_cluster,
					auth: m.auth ? tCommon("enabled") : tCommon("disabled"),
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "service.delete")
		return (
			<div className={"inline"}>
				{t.rich("desc_service_delete", {
					domain: m.domain,
					proxy_cluster: m.proxy_cluster,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	/**
	 * Distributor
	 */

	if (event.activity_code == "reseller.msp.created")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_created", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.activated")
		return <div className={"inline"}>{t("desc_reseller_activated")}</div>;

	if (event.activity_code == "reseller.msp.deleted")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_deleted", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.msp.unlinked")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_unlinked", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.msp.invite.requested")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_invite_requested", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.msp.invite.accepted")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_invite_accepted", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.msp.invite.declined")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_invite_declined", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
				})}
			</div>
		);

	if (event.activity_code == "reseller.msp.updated")
		return (
			<div className={"inline"}>
				{t.rich("desc_reseller_msp_updated", {
					msp_name: m.msp_name,
					msp_domain: m.msp_domain,
					Value: (chunks) => <Value>{chunks}</Value>,
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
							<Label className={"mb-3"}>{t("activityCode")}</Label>
							<Value>{event.activity_code}</Value>
							<Label className={"my-3"}>{t("meta")}</Label>
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
	const t = useTranslations("activity");
	const hasMeta =
		!isEmpty(meta?.location_country_code) ||
		!isEmpty(meta?.location_connection_ip);
	const { countries } = useCountries();

	const countryText = useMemo(() => {
		if (!countries) return t("unknown");
		const country = countries.find(
			(c) => c.country_code === meta?.location_country_code,
		);
		if (!country) return t("unknown");
		if (!meta?.location_city_name) return country.country_name;
		return `${country.country_name}, ${meta?.location_city_name}`;
	}, [countries, meta, t]);

	return hasMeta ? (
		<>
			{" "}
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
