import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { sortBy, unionBy } from "lodash";
import { ChevronsUpDown, MapPin } from "lucide-react";
import * as React from "react";
import { memo, useEffect, useState } from "react";
import { FcLinux } from "react-icons/fc";
import { useElementSize } from "@/hooks/useElementSize";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";

const MapPinIcon = memo(() => <MapPin size={12} />);
MapPinIcon.displayName = "MapPinIcon";

const LinuxIcon = memo(() => (
  <span className={"grayscale brightness-[100%] contrast-[40%]"}>
    <FcLinux className={"text-white text-lg min-w-[20px] brightness-150"} />
  </span>
));
LinuxIcon.displayName = "LinuxIcon";

interface MultiSelectProps {
  value?: Peer;
  onChange: React.Dispatch<React.SetStateAction<Peer | undefined>>;
  excludedPeers?: string[];
  disabled?: boolean;
}

const searchPredicate = (item: Peer, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  if (item.hostname.toLowerCase().includes(lowerCaseQuery)) return true;
  return item.ip.toLowerCase().startsWith(lowerCaseQuery);
};

export function PeerSelector({
  onChange,
  value,
  excludedPeers,
  disabled = false,
}: MultiSelectProps) {
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const [unfilteredItems, setUnfilteredItems] = useState<Peer[]>([]);
  const [filteredItems, search, setSearch] = useSearch(
    unfilteredItems,
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  // Update unfiltered items when peers change
  useEffect(() => {
    if (!peers) return;

    // Sort
    let options = sortBy([...peers], "name") as Peer[];

    // Filter out peers that are not linux
    options = options.filter((peer) => {
      return getOperatingSystem(peer.os) === OperatingSystem.LINUX;
    });

    // Filter out excluded peers
    if (excludedPeers) {
      options = options.filter((peer) => {
        if (!peer.id) return false;
        return !excludedPeers.includes(peer.id);
      });
    }

    setUnfilteredItems(unionBy(options, unfilteredItems, "id"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peers]);

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
                  <LinuxIcon />
                  <TextWithTooltip text={value.name} maxChars={20} />
                </div>

                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                  }
                >
                  <MapPinIcon />
                  {value.ip}
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
        className="w-full p-0 shadow-sm  shadow-nb-gray-950"
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

          {unfilteredItems.length == 0 && search == "" && (
            <DropdownInfoText>
              {
                "Seems like you don't have any linux peers to assign as a routing peer."
              }
            </DropdownInfoText>
          )}

          {filteredItems.length == 0 && search != "" && (
            <DropdownInfoText>
              There are no peers matching your search.
            </DropdownInfoText>
          )}

          {filteredItems.length > 0 && (
            <VirtualScrollAreaList
              items={filteredItems}
              onSelect={togglePeer}
              renderItem={(option) => {
                return (
                  <>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 text-sm",
                        value && value.id == option.id
                          ? "text-white"
                          : "text-nb-gray-300",
                      )}
                    >
                      <LinuxIcon />
                      <TextWithTooltip text={option.name} maxChars={20} />
                    </div>

                    <div
                      className={cn(
                        "font-medium flex items-center gap-1 font-mono text-[10px]",
                        value && value.id == option.id
                          ? "text-white"
                          : "text-nb-gray-300",
                      )}
                    >
                      <MapPinIcon />
                      {option.ip}
                    </div>
                  </>
                );
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
