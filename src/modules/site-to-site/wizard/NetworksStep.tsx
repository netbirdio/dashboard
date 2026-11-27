import Badge from "@components/Badge";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { SelectDropdown } from "@components/select/SelectDropdown";
import ResourceBadge from "@components/ui/ResourceBadge";
import { cn } from "@utils/helpers";
import { NetworkIcon, PlusCircle } from "lucide-react";
import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Network } from "@/interfaces/Network";
import { useSiteToSite } from "@/modules/site-to-site/SiteToSiteProvider";
import {
  NEW_NETWORK,
  SideInfo,
  WizardSide,
} from "@/modules/site-to-site/wizard/wizardSides";

type Props = {
  first: SideInfo;
  second: SideInfo;
  onFirstChange: (side: WizardSide) => void;
  onSecondChange: (side: WizardSide) => void;
  ready: boolean;
};

/** Both networks of the connection, side by side, with the policy's arrow. */
export const NetworksStep = ({
  first,
  second,
  onFirstChange,
  onSecondChange,
  ready,
}: Props) => (
  <div
    className={
      "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-stretch"
    }
  >
    <NetworkCard
      label={"First network"}
      info={first}
      other={second}
      onChange={onFirstChange}
      testId={"first-network"}
    />
    <div
      className={"flex justify-center items-start py-4 sm:py-0 sm:pt-[58px]"}
      aria-hidden={true}
    >
      <Badge
        variant={ready ? "blueDark" : "gray"}
        useHover={false}
        className={"px-3 py-1 rotate-90 sm:rotate-0"}
      >
        <LongArrowLeftIcon
          size={44}
          autoHeight={true}
          className={cn(
            "rotate-180",
            ready
              ? "fill-sky-600 dark:fill-sky-400"
              : "fill-nb-gray-400 dark:fill-nb-gray-500",
          )}
        />
      </Badge>
    </div>
    <NetworkCard
      label={"Second network"}
      info={second}
      other={first}
      onChange={onSecondChange}
      testId={"second-network"}
    />
  </div>
);

type CardProps = {
  label: string;
  info: SideInfo;
  other: SideInfo;
  onChange: (side: WizardSide) => void;
  testId: string;
};

const NetworkCard = ({ label, info, other, onChange, testId }: CardProps) => {
  const { networks } = useSiteToSite();
  const { side } = info;
  const chosen = info.isNew || !!info.network;
  const set = (patch: Partial<WizardSide>) => onChange({ ...side, ...patch });

  const options = [
    ...[...(networks ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((n) => ({
        value: n.id,
        label: n.name,
        icon: NetworkRoutesIcon,
        disabled: other.network?.id === n.id,
      })),
    { value: NEW_NETWORK, label: "Add new network", icon: PlusCircle },
  ];

  return (
    <section
      aria-label={label}
      data-testid={testId}
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-5 min-w-0 transition-colors",
        info.valid
          ? "border-nb-gray-800 bg-nb-gray-900/70"
          : "border-nb-gray-910 bg-nb-gray-900/30",
      )}
    >
      <div
        className={
          "flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-nb-gray-400"
        }
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full border-2 shrink-0",
            info.valid
              ? "border-nb-gray-200 bg-nb-gray-200"
              : "border-nb-gray-600 bg-transparent",
          )}
        />
        {label}
      </div>

      <SelectDropdown
        value={side.networkId}
        onChange={(networkId) => onChange({ ...side, networkId })}
        placeholder={"Select a network..."}
        showSearch={(networks?.length ?? 0) > 6}
        options={options}
      />

      {info.network && <RoutingPeerStatus network={info.network} />}

      {info.isNew && (
        <div>
          <Label>Network Name</Label>
          <Input
            autoFocus={true}
            placeholder={"e.g., Lisbon Office"}
            value={side.name}
            error={info.nameError}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
      )}

      {chosen && info.needsRange && (
        <div className={"flex flex-col gap-4"}>
          {!info.isNew && (
            <Callout variant={"info"}>
              {info.name} has no IP range yet. Add the one its hosts use.
            </Callout>
          )}
          <div>
            <Label>Range Name</Label>
            <Input
              placeholder={"e.g., Lisbon LAN"}
              value={side.rangeName}
              onChange={(e) => set({ rangeName: e.target.value })}
            />
          </div>
          <div>
            <Label>CIDR Block</Label>
            <Input
              customPrefix={<NetworkIcon size={14} />}
              placeholder={"e.g., 10.30.0.0/24"}
              value={side.range}
              error={info.rangeError}
              onChange={(e) => set({ range: e.target.value })}
            />
          </div>
        </div>
      )}

      {chosen && !info.needsRange && (
        <div>
          <HelpText className={"mb-2"}>
            {info.ranges.length === 1 ? "IP range" : "IP ranges"} in{" "}
            {info.name}
          </HelpText>
          <div className={"flex flex-col gap-2"}>
            {info.ranges.map((r) => (
              <div key={r.id} className={"flex items-center gap-3 flex-wrap"}>
                <ResourceBadge resource={r} />
                <span className={"font-mono text-xs text-nb-gray-400"}>
                  {r.address}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!chosen && (
        <div
          className={
            "flex flex-1 items-center justify-center min-h-[72px] rounded-md border border-dashed border-nb-gray-800 px-3 text-center text-sm text-nb-gray-400"
          }
        >
          Pick a network to see its IP ranges.
        </div>
      )}
    </section>
  );
};

const RoutingPeerStatus = ({ network }: { network: Network }) => {
  const { onlineRoutingPeers, countriesOf } = useSiteToSite();
  const online = onlineRoutingPeers(network).length;
  return (
    <div
      className={"flex items-center gap-2 text-xs text-nb-gray-400 -mt-1"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          online >= 2
            ? "bg-green-500"
            : online === 1
            ? "bg-yellow-400"
            : "bg-nb-gray-600",
        )}
      />
      {online > 0 &&
        countriesOf(network).map((c) => (
          <RoundedFlag key={c} country={c} size={12} />
        ))}
      {online > 0
        ? `${online} routing peer${online === 1 ? "" : "s"} online`
        : "No routing peer yet. You'll get setup steps at the end."}
    </div>
  );
};
