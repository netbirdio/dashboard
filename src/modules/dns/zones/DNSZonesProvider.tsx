"use client";

import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { DNSRecord, DNSZone } from "@/interfaces/DNS";
import { Group } from "@/interfaces/Group";
import DNSRecordModal from "@/modules/dns/zones/DNSRecordModal";
import DNSZoneModal from "@/modules/dns/zones/DNSZoneModal";
import { useTranslations } from "next-intl";

type Props = {
  children?: React.ReactNode;
};

const DNSZonesContext = React.createContext(
  {} as {
    createZone: (zone: DNSZone) => Promise<DNSZone>;
    updateZone: (zone: DNSZone) => Promise<DNSZone>;
    deleteZone: (zone: DNSZone) => Promise<DNSZone>;
    openZoneModal: (
      zone?: DNSZone,
      initialDistributionGroups?: Group[],
    ) => void;
    openRecordModal: (zone: DNSZone, record?: DNSRecord) => void;
    addRecord: (zone: DNSZone, record: DNSRecord) => Promise<DNSRecord>;
    updateRecord: (zone: DNSZone, record: DNSRecord) => Promise<DNSRecord>;
    deleteRecord: (zone: DNSZone, record: DNSRecord) => Promise<DNSRecord>;
    askForRecord: (zone: DNSZone) => void;
  },
);

export const DNSZonesProvider = ({ children }: Props) => {
  const { mutate } = useSWRConfig();
  const zoneRequest = useApiCall<DNSZone>("/dns/zones", true);
  const recordRequest = useApiCall<DNSRecord>("/dns/zones", true);
  const [dnsModal, setDnsModal] = useState(false);
  const [recordModal, setRecordModal] = useState(false);
  const [currentZone, setCurrentZone] = useState<DNSZone>();
  const [currentRecord, setCurrentRecord] = useState<DNSRecord>();
  const [initialDistributionGroups, setInitialDistributionGroups] =
    useState<Group[]>();
  const { confirm } = useDialog();
  const t = useTranslations("dns");
  const tCommon = useTranslations("common");

  const createZone = async (zone: DNSZone): Promise<DNSZone> => {
    const promise = zoneRequest.post(zone).then((zone) => {
      mutate("/dns/zones");
      return Promise.resolve(zone);
    });

    notify({
      title: t("notifyZoneAddedTitle", { name: zone.domain }),
      description: t("notifyZoneAddedDesc"),
      promise: promise,
      loadingMessage: t("notifyZoneAddedLoading"),
    });

    return promise;
  };

  const updateZone = async (zone: DNSZone): Promise<DNSZone> => {
    if (!zone?.id) return Promise.reject("Can not update DNS Zone without ID");
    const promise = zoneRequest.put(zone, `/${zone.id}`).then((zone) => {
      mutate("/dns/zones");
      return Promise.resolve(zone);
    });

    notify({
      title: t("notifyZoneUpdatedTitle", { name: zone.domain }),
      description: t("notifyZoneUpdatedDesc"),
      promise: promise,
      loadingMessage: t("notifyZoneUpdatedLoading"),
    });

    return promise;
  };

  const deleteZone = async (zone: DNSZone): Promise<DNSZone> => {
    if (!zone?.id) return Promise.reject("Can not delete DNS Zone without ID");

    const choice = await confirm({
      title: t("confirmDeleteZoneTitle", { name: zone.domain }),
      description: t("confirmDeleteZoneDesc"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return Promise.resolve(zone);

    const promise = zoneRequest.del({}, `/${zone.id}`).then((zone) => {
      mutate("/dns/zones");
      return Promise.resolve(zone);
    });

    notify({
      title: t("notifyZoneDeletedTitle", { name: zone.domain }),
      description: t("notifyZoneDeletedDesc"),
      promise: promise,
      loadingMessage: t("notifyZoneDeletedLoading"),
    });

    return promise;
  };

  const addRecord = async (
    zone: DNSZone,
    record: DNSRecord,
  ): Promise<DNSRecord> => {
    if (!zone?.id)
      return Promise.reject("Can not add DNS Record without DNS Zone");
    const promise = recordRequest
      .post(record, `/${zone.id}/records`)
      .then((record) => {
        mutate("/dns/zones");
        return Promise.resolve(record);
      });

    notify({
      title: t("notifyRecordAddedTitle", {
        type: record.type,
        name: record.name,
      }),
      description: t("notifyRecordAddedDesc"),
      promise: promise,
      loadingMessage: t("notifyRecordAddedLoading"),
    });

    return promise;
  };

  const updateRecord = async (
    zone: DNSZone,
    record: DNSRecord,
  ): Promise<DNSRecord> => {
    if (!zone?.id)
      return Promise.reject("Can not update DNS Record without DNS Zone");
    if (!record?.id)
      return Promise.reject("Can not update DNS Record without ID");
    const promise = recordRequest
      .put(record, `/${zone.id}/records/${record.id}`)
      .then((record) => {
        mutate("/dns/zones");
        return Promise.resolve(record);
      });

    notify({
      title: t("notifyRecordUpdatedTitle", {
        type: record.type,
        name: record.name,
      }),
      description: t("notifyRecordUpdatedDesc"),
      promise: promise,
      loadingMessage: t("notifyRecordUpdatedLoading"),
    });

    return promise;
  };

  const deleteRecord = async (
    zone: DNSZone,
    record: DNSRecord,
  ): Promise<DNSRecord> => {
    if (!zone?.id)
      return Promise.reject("Can not delete DNS Record without DNS Zone");
    if (!record?.id)
      return Promise.reject("Can not delete DNS Record without ID");

    const choice = await confirm({
      title: t("confirmDeleteRecordTitle", { name: record.name }),
      description: t("confirmDeleteRecordDesc"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return Promise.resolve(record);

    const promise = recordRequest
      .del({}, `/${zone.id}/records/${record.id}`)
      .then((record) => {
        mutate("/dns/zones");
        return Promise.resolve(record);
      });

    notify({
      title: t("notifyRecordDeletedTitle", {
        type: record.type,
        name: record.name,
      }),
      description: t("notifyRecordDeletedDesc"),
      promise: promise,
      loadingMessage: t("notifyRecordDeletedLoading"),
    });

    return promise;
  };

  const openZoneModal = (zone?: DNSZone, distributionGroups?: Group[]) => {
    if (zone) setCurrentZone(zone);
    if (distributionGroups) setInitialDistributionGroups(distributionGroups);
    setDnsModal(true);
  };

  const openRecordModal = (zone: DNSZone, record?: DNSRecord) => {
    setCurrentZone(zone);
    if (record) setCurrentRecord(record);
    setRecordModal(true);
  };

  const askForRecord = async (zone: DNSZone) => {
    const choice = await confirm({
      title: t("askForRecordTitle", { name: zone.name }),
      description: t("askForRecordDesc"),
      confirmText: t("addDNSRecord"),
      cancelText: t("askForRecordCancel"),
      type: "default",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return;
    openRecordModal(zone);
  };

  return (
    <DNSZonesContext.Provider
      value={{
        createZone,
        updateZone,
        deleteZone,
        openZoneModal,
        openRecordModal,
        addRecord,
        updateRecord,
        deleteRecord,
        askForRecord,
      }}
    >
      {children}
      <DNSZoneModal
        open={dnsModal}
        onOpenChange={(open) => {
          setDnsModal(open);
          if (!open) {
            setCurrentZone(undefined);
            setInitialDistributionGroups(undefined);
          }
        }}
        onSuccessAdded={(z) => askForRecord(z)}
        zone={currentZone}
        initialDistributionGroups={initialDistributionGroups}
      />
      {currentZone && (
        <DNSRecordModal
          open={recordModal}
          onOpenChange={(open) => {
            setRecordModal(open);
            if (!open) {
              setCurrentZone(undefined);
              setCurrentRecord(undefined);
            }
          }}
          zone={currentZone}
          record={currentRecord}
        />
      )}
    </DNSZonesContext.Provider>
  );
};

export const useDNSZones = () => React.useContext(DNSZonesContext);
