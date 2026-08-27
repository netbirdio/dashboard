import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import FullTooltip from "@components/FullTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { isRoutingPeerSupported } from "@utils/version";
import { sortBy, unionBy } from "lodash";
import { ArrowUpCircleIcon, ChevronsUpDown, MapPin } from "lucide-react";
import * as React from "react";
import { memo, useEffect, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { Peer } from "@/interfaces/Peer";
import {
  getIpPlaceholderFromRange,
  isPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

const MapPinIcon = memo(() => <MapPin size={12} />);
MapPinIcon.displayName = "MapPinIcon";

interface MultiSelectProps {
  value?: Peer;
  onChange: (peer: Peer | undefined) => void;
  excludedPeers?: string[];
  disabled?: boolean;
  /**
   * Peers that don't exist in the API yet — the control center's draft
   * placeholders. Listed above the real ones and exempt from the version gate:
   * their version is unknown until they're installed, so gating on it would make
   * every placeholder unselectable.
   */
  extraPeers?: Peer[];
}

const searchPredicate = (item: Peer, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  if (item.hostname?.toLowerCase().includes(lowerCaseQuery)) return true;
  if (item.ip.toLowerCase().startsWith(lowerCaseQuery)) return true;
  return !!item.ipv6?.toLowerCase().startsWith(lowerCaseQuery);
};

/**
 * What a peer shows in the IP column. A placeholder has no address until it
 * registers, so it shows the masked range its address will come from — the same
 * `100.x.x.x` its canvas card shows (see placeholderIp in ControlCenterContext),
 * which reads as "an address is coming" rather than as an error.
 */
const addressOf = (peer: Peer) =>
  isPlaceholderPeer(peer) ? getIpPlaceholderFromRange() : peer.ip;

/**
 * A placeholder has no version to compare — it isn't installed yet, which is the
 * whole point of picking one here. The install flow is where a too-old agent
 * shows up, not this list.
 */
const supportsRouting = (peer: Peer) =>
  isPlaceholderPeer(peer) || isRoutingPeerSupported(peer.version, peer.os);

export function PeerSelector({
  onChange,
  value,
  excludedPeers,
  disabled = false,
  extraPeers,
}: MultiSelectProps) {
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const [unfilteredItems, setUnfilteredItems] = useState<Peer[]>([]);
  const [filteredItems, search, setSearch] = useSearch(
    unfilteredItems,
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  // Serialised so the effect below reacts to a placeholder being renamed or
  // added, without depending on a fresh array identity each render.
  const extraKey = (extraPeers ?? []).map((p) => `${p.id}:${p.name}`).join("|");
  useEffect(() => {
    if (!peers && !extraPeers?.length) return;

    let options = sortBy([...(peers ?? [])], "name") as Peer[];

    if (excludedPeers) {
      options = options.filter((peer) => {
        if (!peer.id) return false;
        return !excludedPeers.includes(peer.id);
      });
    }

    // Draft placeholders first: they're what the user just drew, and the API
    // list can be long.
    setUnfilteredItems(
      unionBy([...(extraPeers ?? []), ...options], unfilteredItems, "id"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peers, extraKey]);

  const togglePeer = (peer: Peer) => {
    const isSelected = value && value.id == peer.id;
    if (isSelected) {
      onChange(undefined);
    } else {
      onChange(peer);
      setSearch("");
    }
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearch("");
          }, 100);
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "min-h-[46px] w-full relative items-center group",
            "border border-neutral-200 dark:border-nb-gray-700 justify-between py-2 px-3",
            "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer enabled:hover:dark:bg-nb-gray-900/50",
            "disabled:opacity-40 disabled:cursor-default",
          )}
          disabled={disabled}
          ref={inputRef}
        >
          <div
            className={
              "flex items-center w-full gap-2 border-nb-gray-700 flex-wrap h-full"
            }
          >
            {value ? (
              <div
                className={
                  "flex items-center justify-between text-sm text-white w-full pr-4 pl-1"
                }
              >
                <div className={"flex items-center gap-2.5 text-sm"}>
                  <TextWithTooltip text={value.name} maxChars={22} />
                </div>

                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                  }
                >
                  {addressOf(value)}
                </div>
              </div>
            ) : (
              <span>Select a peer...</span>
            )}
          </div>

          <ChevronsUpDown size={18} className={"shrink-0"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached={false}
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: width,
        }}
        align="start"
        side={"top"}
        sideOffset={10}
      >
        <div className={"w-full"}>
          <DropdownInput
            value={search}
            onChange={setSearch}
            placeholder={"Search for peers by name or ip..."}
          />

          {unfilteredItems.length == 0 && !search && (
            <div className={"max-w-xs mx-auto"}>
              <DropdownInfoText>
                {"No peers available to select."}
              </DropdownInfoText>
            </div>
          )}

          {filteredItems.length == 0 && search != "" && (
            <DropdownInfoText>
              There are no peers matching your search.
            </DropdownInfoText>
          )}

          {filteredItems.length > 0 && (
            <VirtualScrollAreaList
              items={filteredItems}
              estimatedItemHeight={37}
              onSelect={(item) => {
                if (!supportsRouting(item)) return;
                togglePeer(item);
              }}
              renderItem={(option) => {
                const isSupported = supportsRouting(option);
                return (
                  <FullTooltip
                    disabled={isSupported}
                    interactive={false}
                    delayDuration={200}
                    skipDelayDuration={350}
                    className={"w-full flex items-center justify-between"}
                    content={
                      <div className={"max-w-[240px] text-xs"}>
                        Please update NetBird to at least{" "}
                        <span className={"text-netbird"}>v0.36.6</span> or later
                        to use this peer as a routing peer.
                      </div>
                    }
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2.5 text-sm",
                        value && value.id == option.id
                          ? "text-white"
                          : "text-nb-gray-300",
                      )}
                    >
                      <PeerOperatingSystemIcon
                        os={option.os}
                        className={isSupported ? "" : "opacity-50"}
                      />
                      <div className={cn(!isSupported && "opacity-50")}>
                        <TextWithTooltip
                          text={option.name}
                          maxChars={22}
                          hideTooltip={!isSupported}
                        />
                      </div>
                      {!isSupported && (
                        <div className={"relative"}>
                          <span className="animate-ping absolute left-0 inline-flex h-[14px] w-[14px] rounded-full bg-netbird opacity-20"></span>
                          <ArrowUpCircleIcon
                            size={14}
                            className={"text-netbird"}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "font-medium flex items-center gap-1 font-mono text-[10px]",
                        value && value.id == option.id
                          ? "text-white"
                          : "text-nb-gray-300",
                        !isSupported && "opacity-50",
                      )}
                    >
                      {addressOf(option)}
                    </div>
                  </FullTooltip>
                );
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
