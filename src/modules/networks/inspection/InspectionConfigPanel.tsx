import Badge from "@components/Badge";
import Card from "@components/Card";
import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import {
  GlobeIcon,
  LayersIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import PeerIcon from "@/assets/icons/PeerIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  InspectionConfig,
  NetworkRouter,
} from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  routers?: NetworkRouter[];
  isLoading: boolean;
};

export const InspectionConfigPanel = ({ routers, isLoading }: Props) => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const inspectionRouter = useMemo(
    () => routers?.find((r) => r.inspection?.enabled),
    [routers],
  );

  const firstRouter = useMemo(() => routers?.[0], [routers]);
  const targetRouter = inspectionRouter ?? firstRouter;

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${targetRouter?.id}`,
  ).put;

  const toggleInspection = async (enabled: boolean) => {
    if (!targetRouter) return;

    const inspection: InspectionConfig = {
      ...(targetRouter.inspection ?? {}),
      enabled,
      mode: targetRouter.inspection?.mode ?? "builtin",
      default_action: targetRouter.inspection?.default_action ?? "allow",
    };

    notify({
      title: "Traffic Inspection",
      description: `Inspection is now ${enabled ? "enabled" : "disabled"}`,
      loadingMessage: "Updating inspection...",
      promise: update({
        ...targetRouter,
        inspection,
      }).then(() => {
        mutate(`/networks/${network?.id}/routers`);
      }),
    });
  };

  const config = inspectionRouter?.inspection;

  if (isLoading) {
    return (
      <Card className="animate-pulse h-24">
        <div />
      </Card>
    );
  }

  if (!routers?.length) {
    return (
      <Card className="flex flex-col items-center justify-center py-8 gap-2">
        <PeerIcon size={18} className={"fill-nb-gray-400"} />
        <p className="text-sm text-nb-gray-400">
          Add a routing peer to this network before enabling traffic inspection.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-md ${config?.enabled ? "bg-green-500/10" : "bg-nb-gray-800"}`}
            >
              <ShieldCheckIcon
                size={16}
                className={
                  config?.enabled ? "text-green-400" : "text-nb-gray-500"
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium text-nb-gray-100">
                Traffic Inspection
              </p>
              <p className="text-xs text-nb-gray-400 mt-0.5">
                {config?.enabled
                  ? "Active. Traffic through this network is being inspected."
                  : "Disabled. Enable to inspect traffic flowing through routing peers."}
              </p>
            </div>
          </div>
          <ToggleSwitch
            disabled={!permission.networks.update}
            checked={config?.enabled ?? false}
            onClick={() => toggleInspection(!(config?.enabled ?? false))}
          />
        </div>

        {config?.enabled && (
          <div className="mt-5 pt-4 border-t border-nb-gray-900/50 grid grid-cols-3 gap-6">
            <ConfigItem
              icon={<SettingsIcon size={14} />}
              label="Mode"
              value={
                config.mode === "external"
                  ? "External Proxy"
                  : config.mode === "envoy"
                    ? "Envoy"
                    : "Built-in"
              }
            />
            <ConfigItem
              icon={<LayersIcon size={14} />}
              label="Default Action"
              value={
                <Badge
                  variant={
                    config.default_action === "block"
                      ? "red"
                      : config.default_action === "inspect"
                        ? "yellow"
                        : "green"
                  }
                  className="text-xs capitalize"
                >
                  {config.default_action ?? "allow"}
                </Badge>
              }
            />
            <ConfigItem
              icon={<GlobeIcon size={14} />}
              label="Redirect Ports"
              value={
                config.redirect_ports?.length
                  ? config.redirect_ports.join(", ")
                  : "All"
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
};

function ConfigItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-nb-gray-500 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-nb-gray-500">{label}</p>
        <div className="text-sm text-nb-gray-200 mt-0.5">{value}</div>
      </div>
    </div>
  );
}
