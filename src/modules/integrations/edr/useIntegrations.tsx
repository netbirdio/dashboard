import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  CrowdstrikeIntegration,
  FleetDMIntegration,
  HuntressIntegration,
  IntuneIntegration,
  SentinelOneIntegration,
  WorkspaceOneIntegration,
} from "@/interfaces/EDR";

export const useIntegrations = () => {
  const { permission } = usePermissions();

  const { data: crowdstrike, isLoading: isCrowdstrikeLoading } =
    useFetchApi<CrowdstrikeIntegration>(
      "/integrations/edr/falcon",
      false,
      false,
      permission?.edr?.read,
    );

  const { data: intune, isLoading: isIntuneLoading } =
    useFetchApi<IntuneIntegration>(
      "/integrations/edr/intune",
      false,
      false,
      permission?.edr?.read,
    );

  const { data: sentinelOne, isLoading: isSentinelOneLoading } =
    useFetchApi<SentinelOneIntegration>(
      "/integrations/edr/sentinelone",
      false,
      false,
      permission?.edr?.read,
    );

  const { data: huntress, isLoading: isHuntressLoading } =
    useFetchApi<HuntressIntegration>(
      "/integrations/edr/huntress",
      false,
      false,
      permission?.edr?.read,
    );

  const { data: fleetdm, isLoading: isFleetDMLoading } =
    useFetchApi<FleetDMIntegration>(
      "/integrations/edr/fleetdm",
      false,
      false,
      permission?.edr?.read,
    );

  const { data: workspaceOne, isLoading: isWorkspaceOneLoading } =
    useFetchApi<WorkspaceOneIntegration>(
      "/integrations/edr/workspaceone",
      false,
      false,
      permission?.edr?.read,
    );

  const isCrowdstrikeEnabled = !!crowdstrike?.enabled;
  const isIntuneEnabled = !!intune?.enabled;
  const isSentinelOneEnabled = !!sentinelOne?.enabled;
  const isHuntressEnabled = !!huntress?.enabled;
  const isFleetDMEnabled = !!fleetdm?.enabled;
  const isWorkspaceOneEnabled = !!workspaceOne?.enabled;

  const isAnyIntegrationEnabled =
    isCrowdstrikeEnabled ||
    isIntuneEnabled ||
    isSentinelOneEnabled ||
    isHuntressEnabled ||
    isFleetDMEnabled ||
    isWorkspaceOneEnabled;

  const activeIntegrationName = useMemo(() => {
    if (isCrowdstrikeEnabled) return "CrowdStrike";
    if (isIntuneEnabled) return "Intune";
    if (isSentinelOneEnabled) return "SentinelOne";
    if (isHuntressEnabled) return "Huntress";
    if (isFleetDMEnabled) return "FleetDM";
    if (isWorkspaceOneEnabled) return "Workspace ONE";
    return "";
  }, [
    isCrowdstrikeEnabled,
    isIntuneEnabled,
    isSentinelOneEnabled,
    isHuntressEnabled,
    isFleetDMEnabled,
    isWorkspaceOneEnabled,
  ]);

  return {
    crowdstrike,
    isCrowdstrikeLoading,
    isCrowdstrikeEnabled,

    intune,
    isIntuneLoading,
    isIntuneEnabled,

    sentinelOne,
    isSentinelOneLoading,
    isSentinelOneEnabled,

    huntress,
    isHuntressLoading,
    isHuntressEnabled,

    fleetdm,
    isFleetDMLoading,
    isFleetDMEnabled,

    workspaceOne,
    isWorkspaceOneLoading,
    isWorkspaceOneEnabled,

    isAnyIntegrationEnabled,
    activeIntegrationName,
  };
};
