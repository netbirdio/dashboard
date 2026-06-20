import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import { cn } from "@utils/helpers";
import { Settings } from "lucide-react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import * as React from "react";
import { useMemo, useState } from "react";
import {
  DomainValidationStatus,
  EnterpriseConnection,
} from "@/interfaces/IdentityProvider";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import OidcSetupModal from "@/modules/integrations/sso/oidc/OidcSetupModal";
import { OktaSsoSettings } from "@/modules/integrations/sso/okta/OktaSSOSettings";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  name: string;
  description: string;
  site: string;
  siteHref: string;
  logo: StaticImport | string;
  discoveryPlaceholder?: string;
};

export const OidcIntegrationCard = ({
  name,
  description,
  site,
  siteHref,
  logo,
  discoveryPlaceholder,
}: Props) => {
  const [setupModal, setSetupModal] = useState(false);
  const { oktaConnection, isDataLoading, toggleConnection, mutate, error } =
    useEnterpriseConnections();

  const handleToggleConnection = () => {
    if (!oktaConnection) return;
    notify({
      title: "OIDC Integration",
      description: `Okta was successfully ${
        oktaConnection?.enabled ? "disabled" : "enabled"
      }`,
      promise: toggleConnection(oktaConnection.id).then(() => {
        mutate();
      }),
      loadingMessage: "Updating integration...",
    });
  };

  return isDataLoading ? (
    <SkeletonIntegration loadingHeight={197} />
  ) : (
    <>
      <IntegrationCard
        name={name}
        description={description}
        data={oktaConnection}
        url={{
          title: site,
          href: siteHref,
        }}
        disabled={error}
        switchState={oktaConnection?.enabled || false}
        onEnabledChange={() => {
          if (!oktaConnection) setSetupModal(true);
          else handleToggleConnection();
        }}
        image={logo}
        onSetup={() => setSetupModal(true)}
      >
        {oktaConnection && <ConfigurationContent connection={oktaConnection} />}
      </IntegrationCard>

      <OidcSetupModal
        open={setupModal}
        onOpenChange={setSetupModal}
        name={name}
        logo={logo}
        discoveryPlaceholder={discoveryPlaceholder}
      />
    </>
  );
};

type ConfigurationProps = {
  connection: EnterpriseConnection;
};

const ConfigurationContent = ({ connection }: ConfigurationProps) => {
  const [open, setOpen] = useState(false);

  const hasSomePendingDomains = useMemo(() => {
    return connection?.domains?.some(
      (domain) => domain.validation_status === DomainValidationStatus.PENDING,
    );
  }, [connection]);

  const hasSomeFailedDomains = useMemo(() => {
    return connection?.domains?.some(
      (domain) => domain.validation_status === DomainValidationStatus.FAILED,
    );
  }, [connection]);

  const hasSomeVerifiedDomains = useMemo(() => {
    return connection?.domains?.some(
      (domain) => domain.validation_status === DomainValidationStatus.VERIFIED,
    );
  }, [connection]);

  return (
    <div className={"flex gap-2 justify-between"}>
      {connection.enabled ? (
        <div
          className={
            "text-sm flex gap-2 items-center text-nb-gray-300 font-medium"
          }
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",

              hasSomeVerifiedDomains
                ? "bg-green-400"
                : hasSomePendingDomains
                ? "bg-yellow-400"
                : hasSomeFailedDomains
                ? "bg-red-500"
                : "bg-nb-gray-300",
            )}
          ></span>
          {hasSomeVerifiedDomains
            ? "Active"
            : hasSomePendingDomains
            ? "Pending Verification"
            : hasSomeFailedDomains
            ? "Failed Verification"
            : "Inactive"}
        </div>
      ) : (
        <div
          className={
            "text-sm flex gap-2 items-center text-nb-gray-400 font-medium"
          }
        >
          <span className={cn("h-2 w-2 rounded-full bg-nb-gray-600")}></span>
          Inactive
        </div>
      )}
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"items-center"}
        onClick={() => setOpen(true)}
      >
        <Settings size={14} />
        Settings
      </Button>
      {open && (
        <OktaSsoSettings
          config={connection}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  );
};
