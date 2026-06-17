"use client";

import useFetchApi, { useApiCall } from "@utils/api";
import React, { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";
import type {
  CAConfig,
  CATestResult,
  DeviceAuthSettings,
  DeviceCert,
  DeviceEnrollment,
  InventoryConfig,
  TrustedCA,
} from "@/interfaces/DeviceSecurity";

type DeviceSecurityContextValue = {
  // Settings
  settings: DeviceAuthSettings | undefined;
  settingsLoading: boolean;
  updateSettings: (s: Partial<DeviceAuthSettings>) => Promise<DeviceAuthSettings>;

  // Enrollments
  enrollments: DeviceEnrollment[] | undefined;
  enrollmentsLoading: boolean;
  approveEnrollment: (id: string) => Promise<void>;
  rejectEnrollment: (id: string, reason?: string) => Promise<void>;

  // Devices (issued certs)
  devices: DeviceCert[] | undefined;
  devicesLoading: boolean;
  revokeDevice: (id: string) => Promise<void>;
  renewDevice: (id: string) => Promise<void>;

  // Trusted CAs
  trustedCAs: TrustedCA[] | undefined;
  trustedCAsLoading: boolean;
  addTrustedCA: (name: string, pem: string) => Promise<TrustedCA>;
  deleteTrustedCA: (id: string) => Promise<void>;

  // CA Config
  caConfig: CAConfig | undefined;
  caConfigLoading: boolean;
  updateCAConfig: (config: CAConfig) => Promise<CAConfig>;
  testCAConnection: (config: CAConfig) => Promise<CATestResult>;

  // Inventory Config
  inventoryConfig: InventoryConfig | undefined;
  inventoryConfigLoading: boolean;
  updateInventoryConfig: (config: InventoryConfig) => Promise<InventoryConfig>;
};

const DeviceSecurityContext = React.createContext(
  {} as DeviceSecurityContextValue,
);

export function DeviceSecurityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mutate } = useSWRConfig();

  const { data: settings, isLoading: settingsLoading } =
    useFetchApi<DeviceAuthSettings>("/device-auth/settings");

  const { data: enrollments, isLoading: enrollmentsLoading } =
    useFetchApi<DeviceEnrollment[]>(
      "/device-auth/enrollments",
      false,
      true,
      true,
      { refreshInterval: 10_000 },
    );

  const { data: devices, isLoading: devicesLoading } =
    useFetchApi<DeviceCert[]>("/device-auth/devices");

  const { data: trustedCAs, isLoading: trustedCAsLoading } =
    useFetchApi<TrustedCA[]>("/device-auth/trusted-cas");

  const { data: caConfig, isLoading: caConfigLoading } =
    useFetchApi<CAConfig>("/device-auth/ca/config");

  const { data: inventoryConfig, isLoading: inventoryConfigLoading } =
    useFetchApi<InventoryConfig>("/device-auth/inventory/config");

  const settingsRequest = useApiCall<DeviceAuthSettings>(
    "/device-auth/settings",
  );
  const enrollmentRequest = useApiCall<void>("/device-auth/enrollments");
  const deviceRequest = useApiCall<void>("/device-auth/devices");
  const caRequest = useApiCall<TrustedCA>("/device-auth/trusted-cas");
  const caConfigRequest = useApiCall<CAConfig>("/device-auth/ca/config");
  const caTestRequest = useApiCall<CATestResult>("/device-auth/ca/test");
  const inventoryConfigRequest = useApiCall<InventoryConfig>(
    "/device-auth/inventory/config",
  );

  const updateSettings = useCallback(
    async (s: Partial<DeviceAuthSettings>) => {
      const updated = await settingsRequest.put(s);
      await mutate("/device-auth/settings");
      return updated;
    },
    [settingsRequest, mutate],
  );

  const approveEnrollment = useCallback(
    async (id: string) => {
      await enrollmentRequest.post(null, `/${id}/approve`);
      await mutate("/device-auth/enrollments");
    },
    [enrollmentRequest, mutate],
  );

  const rejectEnrollment = useCallback(
    async (id: string, reason?: string) => {
      await enrollmentRequest.post(reason ? { reason } : null, `/${id}/reject`);
      await mutate("/device-auth/enrollments");
    },
    [enrollmentRequest, mutate],
  );

  const revokeDevice = useCallback(
    async (id: string) => {
      await deviceRequest.post(null, `/${id}/revoke`);
      await mutate("/device-auth/devices");
    },
    [deviceRequest, mutate],
  );

  const renewDevice = useCallback(
    async (id: string) => {
      await deviceRequest.post(null, `/${id}/cert/renew`);
      await mutate("/device-auth/devices");
    },
    [deviceRequest, mutate],
  );

  const addTrustedCA = useCallback(
    async (name: string, pem: string) => {
      const created = await caRequest.post({ name, pem });
      await mutate("/device-auth/trusted-cas");
      return created;
    },
    [caRequest, mutate],
  );

  const deleteTrustedCA = useCallback(
    async (id: string) => {
      await caRequest.del(null, `/${id}`);
      await mutate("/device-auth/trusted-cas");
    },
    [caRequest, mutate],
  );

  const updateCAConfig = useCallback(
    async (config: CAConfig) => {
      const updated = await caConfigRequest.put(config);
      await mutate("/device-auth/ca/config");
      return updated;
    },
    [caConfigRequest, mutate],
  );

  const testCAConnection = useCallback(
    async (config: CAConfig) => {
      return await caTestRequest.post(config);
    },
    [caTestRequest],
  );

  const updateInventoryConfig = useCallback(
    async (config: InventoryConfig) => {
      const updated = await inventoryConfigRequest.put(config);
      await mutate("/device-auth/inventory/config");
      return updated;
    },
    [inventoryConfigRequest, mutate],
  );

  const value = useMemo(
    () => ({
      settings,
      settingsLoading,
      updateSettings,
      enrollments,
      enrollmentsLoading,
      approveEnrollment,
      rejectEnrollment,
      devices,
      devicesLoading,
      revokeDevice,
      renewDevice,
      trustedCAs,
      trustedCAsLoading,
      addTrustedCA,
      deleteTrustedCA,
      caConfig,
      caConfigLoading,
      updateCAConfig,
      testCAConnection,
      inventoryConfig,
      inventoryConfigLoading,
      updateInventoryConfig,
    }),
    [
      settings,
      settingsLoading,
      updateSettings,
      enrollments,
      enrollmentsLoading,
      approveEnrollment,
      rejectEnrollment,
      devices,
      devicesLoading,
      revokeDevice,
      renewDevice,
      trustedCAs,
      trustedCAsLoading,
      addTrustedCA,
      deleteTrustedCA,
      caConfig,
      caConfigLoading,
      updateCAConfig,
      testCAConnection,
      inventoryConfig,
      inventoryConfigLoading,
      updateInventoryConfig,
    ],
  );

  return (
    <DeviceSecurityContext.Provider value={value}>
      {children}
    </DeviceSecurityContext.Provider>
  );
}

export const useDeviceSecurity = () => React.useContext(DeviceSecurityContext);
export const useDeviceSecurityContext = () =>
  React.useContext(DeviceSecurityContext);
