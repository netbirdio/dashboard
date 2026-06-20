import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi from "@utils/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MSP } from "@/cloud/msp/interfaces/MSP";
import { TenantListItem, TenantStatus } from "@/cloud/msp/interfaces/Tenant";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";

type Props = {
  children: React.ReactNode;
};

const MSPContext = React.createContext(
  {} as {
    mspInfo?: MSP;
    isMspInfoLoading: boolean;
    mspContact?: string;

    tenantListItems?: TenantListItem[];
    isTenantListItemsLoading: boolean;

    mspAccount?: TenantListItem;
    currentAccount?: TenantListItem;
    isActive: boolean;

    loginAs: (tenant?: TenantListItem) => void;

    isMSPInMSPContext: boolean;
    isMSPInTenantContext: boolean;
    isAccountWithoutMSP?: boolean;
    isAccountWithMSPParent?: boolean;

    hasReseller?: boolean;
  },
);

export default function MSPProvider({ children }: Readonly<Props>) {
  const {
    data: mspInfo,
    isLoading: isMspInfoLoading,
    error,
  } = useFetchApi<MSP>("/integrations/msp", true);
  const { isOwner } = useLoggedInUser();

  const { data: tenantListItems, isLoading: isTenantListItemsLoading } =
    useFetchApi<TenantListItem[]>("/integrations/msp/switcher", true);

  const { globalApiParams, setGlobalApiParams } = useApplicationContext();
  const currentAccountId = globalApiParams?.account;

  const isActive = useMemo(() => {
    try {
      if (isMspInfoLoading || mspInfo === undefined || error) return false;
      if (!Object.hasOwn(mspInfo, "activated_at")) return false;
      return mspInfo.activated_at !== "";
    } catch (err) {
      return false;
    }
  }, [isMspInfoLoading, mspInfo, error]);

  const refreshPage = useCallback(() => {
    setTimeout(() => {
      window.location.href = "/peers";
    }, 500);
  }, []);

  useEffect(() => {
    if (isTenantListItemsLoading || isMspInfoLoading) return;
    if (currentAccountId) {
      const tenant = tenantListItems?.find((t) => t.id === currentAccountId);
      if (!tenant) {
        setGlobalApiParams?.({});
        refreshPage();
      }
    }
  }, [
    tenantListItems,
    currentAccountId,
    isTenantListItemsLoading,
    isMspInfoLoading,
    setGlobalApiParams,
    refreshPage,
  ]);

  const mspAccount = useMemo(() => {
    if (!mspInfo || isMspInfoLoading) return;
    return {
      id: "msp",
      domain: mspInfo.parent_domain ?? mspInfo.domain,
      name: mspInfo.parent_name ?? mspInfo.name,
      isMSP: true,
    } as TenantListItem;
  }, [mspInfo, isMspInfoLoading]);

  const currentAccount = useMemo(() => {
    return tenantListItems?.find((t) => t.id === currentAccountId);
  }, [tenantListItems, currentAccountId]);

  const [isSwitching, setIsSwitching] = useState(false);

  const loginAs = useCallback(
    (tenant?: TenantListItem) => {
      setIsSwitching(true);
      if (tenant?.isMSP || !tenant) {
        setGlobalApiParams?.({});
      } else {
        setGlobalApiParams?.({ account: tenant.id });
      }
      refreshPage();
    },
    [setGlobalApiParams, refreshPage],
  );

  const mspContact = useMemo(() => {
    if (!mspInfo) return;
    if (mspInfo?.parent_owner_name) {
      return `${mspInfo.parent_owner_name} (${
        mspInfo?.parent_owner_email || mspInfo?.parent_domain || mspInfo?.domain
      })`;
    }
    return `${mspInfo?.parent_name || mspInfo?.name} (${
      mspInfo?.parent_domain || mspInfo?.domain
    })`;
  }, [mspInfo]);

  const isMSPInMSPContext = useMemo(() => {
    if (isMspInfoLoading || mspInfo === undefined || error) return false;
    if (!isActive) return false;
    return Object.hasOwn(mspInfo, "name") && !currentAccount;
  }, [isMspInfoLoading, mspInfo, error, isActive, currentAccount]);

  const isMSPInTenantContext = useMemo(() => {
    if (isMspInfoLoading || mspInfo === undefined || error) return false;
    return Object.hasOwn(mspInfo, "parent_name") && !!currentAccount;
  }, [isMspInfoLoading, mspInfo, error, currentAccount]);

  const isAccountWithoutMSP = useMemo(() => {
    if (isMspInfoLoading) return undefined;
    if (!mspInfo || error) return true;
    return (
      !Object.hasOwn(mspInfo, "parent_name") &&
      !Object.hasOwn(mspInfo, "name") &&
      !currentAccount
    );
  }, [isMspInfoLoading, mspInfo, error, currentAccount]);

  const hasReseller = useMemo(() => {
    if (isMspInfoLoading) return undefined;
    return mspInfo?.reseller_status === "active";
  }, [isMspInfoLoading, mspInfo]);

  const isAccountWithMSPParent = useMemo(() => {
    if (isMspInfoLoading) return undefined;
    if (hasReseller) return true;
    if (error || !mspInfo) return false;
    const isExisting = mspInfo?.status === TenantStatus.Existing;
    const isInvited = mspInfo?.status === TenantStatus.Invited;
    if (isExisting || isInvited) return false;
    return Object.hasOwn(mspInfo, "parent_name");
  }, [isMspInfoLoading, mspInfo, error]);

  const contextData = useMemo(
    () => ({
      mspInfo,
      isMspInfoLoading,
      isActive,
      tenantListItems,
      isTenantListItemsLoading,
      currentAccount,
      mspAccount,
      loginAs,
      isMSPInTenantContext,
      mspContact,
      isMSPInMSPContext,
      isAccountWithoutMSP,
      isAccountWithMSPParent,
      hasReseller,
    }),
    [
      mspInfo,
      isMspInfoLoading,
      isActive,
      tenantListItems,
      isTenantListItemsLoading,
      currentAccount,
      mspAccount,
      loginAs,
      mspContact,
      isMSPInMSPContext,
      isMSPInTenantContext,
      isAccountWithoutMSP,
      isAccountWithMSPParent,
      hasReseller,
    ],
  );

  return isSwitching ? (
    <FullScreenLoading />
  ) : (
    <MSPContext.Provider value={contextData}>{children}</MSPContext.Provider>
  );
}

export const useMSP = () => React.useContext(MSPContext);
