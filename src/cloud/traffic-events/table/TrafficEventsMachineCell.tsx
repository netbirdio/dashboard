import CopyToClipboardText from "@components/CopyToClipboardText";
import FullTooltip from "@components/FullTooltip";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconDirectionSign } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import {
  FlagIcon,
  GlobeIcon,
  MailIcon,
  MapPin,
  NetworkIcon,
  RouteIcon,
  UserIcon,
  WorkflowIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import {
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventMachine,
  TrafficEventMachineType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { stripZeroPort } from "@/cloud/traffic-events/utils/parseAddress";
import { useCountries } from "@/contexts/CountryProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  event: TrafficEvent;
  isSource?: boolean;
};
export const TrafficEventsMachineCell = ({
  event,
  isSource = false,
}: Props) => {
  const t = useTranslations();
  const router = useRouter();
  const machine = isSource ? event.source : event.destination;
  const isPeer = machine.type === TrafficEventMachineType.PEER;
  const { isLoading: isGeoDataLoading, getRegionText } = useCountries();

  const redirectToPeer = () => {
    if (!isPeer) return;
    if (!machine.id) return;
    router.push(`/peer?id=${machine.id}`);
  };

  const countryText = getRegionText(
    machine.geo_location.country_code,
    machine.geo_location.city_name,
  );

  const hasNameAndEmail = isPeer && !!event.user.email && !!event.user.name;
  const showUserOnSource =
    isSource &&
    hasNameAndEmail &&
    event.direction === TrafficEventDirection.EGRESS;
  const showUserOnDestination =
    !isSource &&
    hasNameAndEmail &&
    event.direction === TrafficEventDirection.INGRESS;
  const showUser = showUserOnSource || showUserOnDestination;

  const isExitNode = machine.name?.includes("Exit Node");

  return (
    <FullTooltip
      delayDuration={250}
      skipDelayDuration={100}
      contentClassName={"p-0"}
      interactive={true}
      content={
        <div
          className={"text-xs flex flex-col"}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {machine.type !== TrafficEventMachineType.UNKNOWN && (
            <ListItem
              icon={
                <ResourceIcon
                  size={14}
                  type={machine.type}
                  name={machine.name}
                />
              }
              label={
                machine.type === TrafficEventMachineType.PEER
                  ? t("trafficEvents.peer")
                  : isExitNode
                  ? t("common.exitNode")
                  : t("common.resource")
              }
              value={
                <CopyToClipboardText
                  iconAlignment={"right"}
                  message={t("trafficEvents.iPHasBeenCopiedToYourClipboard")}
                  alwaysShowIcon={true}
                >
                  {machine.name || t("common.unknown")}
                </CopyToClipboardText>
              }
            />
          )}

          {machine.dns_label && (
            <ListItem
              icon={<GlobeIcon size={14} />}
              label={t("common.domain")}
              value={
                <CopyToClipboardText
                  iconAlignment={"right"}
                  message={t(
                    "trafficEvents.domainHasBeenCopiedToYourClipboard",
                  )}
                  alwaysShowIcon={true}
                >
                  {machine.dns_label}
                </CopyToClipboardText>
              }
            />
          )}

          {showUser && (
            <>
              <ListItem
                icon={<UserIcon size={14} />}
                label={t("trafficEvents.user")}
                value={
                  <CopyToClipboardText
                    iconAlignment={"right"}
                    message={t("trafficEvents.iPHasBeenCopiedToYourClipboard")}
                    alwaysShowIcon={true}
                  >
                    {event?.user.name}
                  </CopyToClipboardText>
                }
              />
              {event?.user.email && (
                <ListItem
                  icon={<MailIcon size={14} />}
                  label={t("trafficEvents.userEMail")}
                  value={
                    <CopyToClipboardText
                      iconAlignment={"right"}
                      message={t(
                        "trafficEvents.eMailHasBeenCopiedToYourClipboard",
                      )}
                      alwaysShowIcon={true}
                    >
                      {event?.user.email}
                    </CopyToClipboardText>
                  }
                />
              )}
            </>
          )}

          <ListItem
            icon={<MapPin size={14} />}
            label={isSource ? t("common.source") : t("common.destination")}
            value={
              <CopyToClipboardText
                iconAlignment={"right"}
                message={t("trafficEvents.iPHasBeenCopiedToYourClipboard")}
                alwaysShowIcon={true}
              >
                {stripZeroPort(machine.address ?? "")}
              </CopyToClipboardText>
            }
          />

          <ListItem
            icon={<FlagIcon size={14} />}
            label={t("trafficEvents.region")}
            value={
              <>
                {isGeoDataLoading ? (
                  <Skeleton width={140} />
                ) : (
                  <CopyToClipboardText
                    iconAlignment={"right"}
                    message={t(
                      "trafficEvents.regionHasBeenCopiedToYourClipboard",
                    )}
                    alwaysShowIcon={true}
                  >
                    <div className={"flex gap-2 items-center"}>
                      {countryText}
                    </div>
                  </CopyToClipboardText>
                )}
              </>
            }
          />
        </div>
      }
    >
      <MachineCard
        machine={machine}
        showUser={showUser}
        onClick={isPeer ? redirectToPeer : undefined}
      />
    </FullTooltip>
  );
};

const ListItem = ({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex justify-between gap-12 border-b border-nb-gray-920 py-2 px-4 last:border-b-0",
        className,
      )}
    >
      <div className={"flex items-center gap-2 text-nb-gray-100 font-medium"}>
        {icon}
        {label}
      </div>
      <div className={"text-nb-gray-300"}>{value}</div>
    </div>
  );
};

type MachineCardProps = {
  machine: TrafficEventMachine;
  onClick?: () => void;
  showUser?: boolean;
};
export const MachineCard = ({
  machine,
  onClick,
  showUser = false,
}: MachineCardProps) => {
  const t = useTranslations();

  const isPeer = machine.type === TrafficEventMachineType.PEER;

  return (
    <button
      className={cn(
        "flex shrink-0 items-center gap-2.5 text-nb-gray-300 text-left py-0.5 pl-2 pr-3 rounded-md group/machine",
        "hover:bg-nb-gray-920",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-9 w-9 shrink-0 bg-nb-gray-900 transition-all",
          "group-hover:bg-nb-gray-800 relative",
        )}
      >
        {isPeer && machine.os ? (
          <PeerOSIcon os={machine.os} />
        ) : (
          <ResourceIcon type={machine.type} name={machine.name} />
        )}
        {machine.geo_location.country_code && (
          <div className={"absolute -bottom-[4px] -right-[4px]"}>
            <div
              className={cn(
                "flex items-center justify-center rounded-full border-[3px] shrink-0",
                "border-nb-gray-950",
                "group-hover/table-row:border-nb-gray-940",
                "group-hover/machine:!border-nb-gray-920",
              )}
            >
              <RoundedFlag
                country={machine.geo_location.country_code}
                size={10}
              />
            </div>
          </div>
        )}
      </div>
      <div className={"flex flex-col gap-0 leading-none justify-center mt-1"}>
        <span
          className={
            "mb-1 font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2"
          }
        >
          <TextWithTooltip
            text={machine.name || t("common.unknown")}
            maxChars={20}
            hideTooltip={true}
          />
        </span>
        <span
          className={
            "text-sm font-normal text-nb-gray-400 -top-[0.2rem] relative"
          }
        >
          {stripZeroPort(machine.address)}
        </span>
      </div>
    </button>
  );
};

const PeerOSIcon = ({ os }: { os: string }) => {
  const osType = getOperatingSystem(os);
  return (
    <div
      className={cn(
        "flex items-center justify-center grayscale brightness-[100%] contrast-[40%]",
        "w-4 h-4 shrink-0",
        osType === OperatingSystem.WINDOWS && "p-[2.5px]",
        osType === OperatingSystem.APPLE && "p-[2.7px]",
        osType === OperatingSystem.FREEBSD && "p-[1.5px]",
      )}
    >
      <OSLogo os={os} />
    </div>
  );
};

const ResourceIcon = ({
  type,
  size = 15,
  name,
}: {
  type: TrafficEventMachineType;
  size?: number;
  name?: string;
}) => {
  if (name?.includes("Exit Node")) {
    return <IconDirectionSign size={size} className={"text-yellow-400"} />;
  }

  switch (type) {
    case TrafficEventMachineType.DOMAIN_RESOURCE:
      return <GlobeIcon size={size} />;
    case TrafficEventMachineType.SUBNET_RESOURCE:
      return <NetworkIcon size={size} />;
    case TrafficEventMachineType.HOST_RESOURCE:
      return <WorkflowIcon size={size} />;
    case TrafficEventMachineType.ROUTE:
      return <RouteIcon size={size} />;
    default:
      return <RouteIcon size={size} />;
  }
};
