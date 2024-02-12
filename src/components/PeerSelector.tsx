import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import SmallOSIcon from "@components/ui/SmallOSIcon";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { IconArrowBack } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { sortBy, trim, unionBy } from "lodash";
import { ChevronsUpDown, MapPin, SearchIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";

interface MultiSelectProps {
  value?: Peer;
  onChange: React.Dispatch<React.SetStateAction<Peer | undefined>>;
  excludedPeers?: string[];
  disabled?: boolean;
}

export function PeerSelector({
  onChange,
  value,
  excludedPeers,
  disabled = false,
}: MultiSelectProps) {
  const { data: peers } = useFetchApi<Peer[]>("/peers");

  const [dropdownOptions, setDropdownOptions] = useState<Peer[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  // Update dropdown options when peers change
  useEffect(() => {
    if (!peers) return;

    // Sort
    let options = sortBy([...peers], "name") as Peer[];

    // Filter out peers that are not linux
    options = options.filter((peer) => {
      return getOperatingSystem(peer.os) == OperatingSystem.LINUX;
    });

    // Filter out excluded peers
    if (excludedPeers) {
      options = options.filter((peer) => {
        if (!peer.id) return false;
        return !excludedPeers.includes(peer.id);
      });
    }

    setDropdownOptions(unionBy(options, dropdownOptions, "name"));
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
  };

  const peerNotFound = useMemo(() => {
    const isSearching = search.length > 0;

    // Search peer by ip or name
    const peerFound =
      dropdownOptions.filter((item) => {
        return (
          item.name.includes(search) ||
          item.hostname.includes(search) ||
          item.ip.includes(search)
        );
      }).length > 0;

    return isSearching && !peerFound;
  }, [search, dropdownOptions]);

  const [open, setOpen] = useState(false);

  const [slice, setSlice] = useState(10);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setSlice(dropdownOptions.length);
      }, 100);
    } else {
      setSlice(10);
    }
  }, [open, dropdownOptions]);

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
            "min-h-[42px] w-full relative items-center group",
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
                  <SmallOSIcon os={value.os} />
                  <TextWithTooltip text={value.name} maxChars={20} />
                </div>

                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                  }
                >
                  <MapPin size={12} />
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
        forceMount={true}
        align="start"
        side={"top"}
        sideOffset={10}
      >
        <Command
          className={"w-full flex"}
          loop
          filter={(value, search) => {
            const formatValue = trim(value.toLowerCase());
            const formatSearch = trim(search.toLowerCase());
            if (formatValue.includes(formatSearch)) return 1;
            return 0;
          }}
        >
          <CommandList className={"w-full"}>
            <div className={"relative"}>
              <CommandInput
                className={cn(
                  "min-h-[42px] w-full relative",
                  "border-b-0 border-t-0 border-r-0 border-l-0 border-neutral-200 dark:border-nb-gray-700 items-center",
                  "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
                  "dark:placeholder:text-neutral-500 font-light placeholder:text-neutral-500 pl-10",
                )}
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={"Search for peers by name or ip..."}
              />
              <div
                className={
                  "absolute left-0 top-0 h-full flex items-center pl-4"
                }
              >
                <div className={"flex items-center"}>
                  <SearchIcon size={14} />
                </div>
              </div>
              <div
                className={
                  "absolute right-0 top-0 h-full flex items-center pr-4"
                }
              >
                <div
                  className={
                    "flex items-center bg-nb-gray-800 py-1 px-1.5 rounded-[4px] border border-nb-gray-500"
                  }
                >
                  <IconArrowBack size={10} />
                </div>
              </div>
            </div>

            <div className={""}>
              {dropdownOptions.length == 0 && !peerNotFound && (
                <div
                  className={
                    "text-center pb-2 text-nb-gray-500 max-w-xs mx-auto"
                  }
                >
                  {
                    "Seems like you don't have any linux peers to assign as a routing peer."
                  }
                </div>
              )}
              {peerNotFound && (
                <div className={"text-center pb-2 text-nb-gray-500"}>
                  There are no peers matching your search.
                </div>
              )}
              <CommandGroup>
                <ScrollArea
                  className={
                    "max-h-[180px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
                  }
                >
                  {dropdownOptions.slice(0, slice).map((option) => {
                    return (
                      <CommandItem
                        key={option.name}
                        value={option.name + option.id}
                        onSelect={() => {
                          togglePeer(option);
                          setOpen(false);
                        }}
                      >
                        <div className={"flex items-center gap-2.5 text-sm"}>
                          <SmallOSIcon os={option.os} />
                          <TextWithTooltip text={option.name} maxChars={20} />
                        </div>

                        <div
                          className={
                            "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                          }
                        >
                          <MapPin size={12} />
                          {option.ip}
                        </div>
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
