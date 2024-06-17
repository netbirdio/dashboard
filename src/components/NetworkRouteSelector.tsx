import { CommandItem } from "@components/Command";
import FullTooltip from "@components/FullTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { IconArrowBack } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { sortBy, trim, unionBy } from "lodash";
import { ChevronsUpDown, SearchIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useElementSize } from "@/hooks/useElementSize";
import { GroupedRoute, Route } from "@/interfaces/Route";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";

interface MultiSelectProps {
  value?: GroupedRoute;
  onChange: React.Dispatch<React.SetStateAction<GroupedRoute | undefined>>;
  disabled?: boolean;
}

export function NetworkRouteSelector({
  onChange,
  value,
  disabled = false,
}: MultiSelectProps) {
  const { data: routes } = useFetchApi<Route[]>("/routes");
  const groupedRoutes = useGroupedRoutes({ routes });

  const [dropdownOptions, setDropdownOptions] = useState<GroupedRoute[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  // Update dropdown options when peers change
  useEffect(() => {
    if (!groupedRoutes) return;

    // Sort
    let options = sortBy([...groupedRoutes], "network_id") as GroupedRoute[];

    // Filter out networks that are groups
    options = options.filter((peer) => {
      return !peer.is_using_route_groups;
    });

    setDropdownOptions(unionBy(options, dropdownOptions, "name"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedRoutes]);

  const togglePeer = (network: GroupedRoute) => {
    const isSelected = value && value.id == network.id;
    if (isSelected) {
      onChange(undefined);
    } else {
      onChange(network);
      setSearch("");
    }
  };

  const notFound = useMemo(() => {
    const isSearching = search.length > 0;
    const found =
      dropdownOptions.filter((item) => {
        const hasDomains = item?.domains ? item.domains.length > 0 : false;
        const domains =
          hasDomains && item?.domains ? item?.domains.join(" ") : "";
        return (
          item.network_id.includes(search) ||
          item.network?.includes(search) ||
          domains.includes(search)
        );
      }).length > 0;
    return isSearching && !found;
  }, [search, dropdownOptions]);

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
                  <NetworkRoutesIcon size={16} />
                  {value.network_id}
                </div>

                <div
                  className={
                    "text-neutral-500 mt-.5 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                  }
                >
                  {value.network}
                </div>
                <DomainList domains={value?.domains} />
              </div>
            ) : (
              <span>Select an existing network...</span>
            )}
          </div>

          <ChevronsUpDown size={18} className={"shrink-0"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm  shadow-nb-gray-950"
        style={{
          width: width,
        }}
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
                placeholder={"Search for network by name or cidr..."}
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

            <div className={"p-2"}>
              {dropdownOptions.length == 0 && !notFound && (
                <div
                  className={
                    "text-center pb-2 text-nb-gray-500 max-w-xs mx-auto"
                  }
                >
                  {"Seems like you don't have any network routes created yet."}
                </div>
              )}
              {notFound && (
                <div className={"text-center pb-2 text-nb-gray-500"}>
                  There are no networks matching your search.
                </div>
              )}
              <CommandGroup>
                <div
                  className={
                    "max-h-[180px] overflow-y-auto flex flex-col gap-1"
                  }
                >
                  {dropdownOptions.map((option) => {
                    return (
                      <CommandItem
                        key={option.network + option.network_id}
                        value={
                          option.network +
                          option.network_id +
                          option?.domains?.join(", ")
                        }
                        onSelect={() => {
                          togglePeer(option);
                          setOpen(false);
                        }}
                      >
                        <div className={"flex items-center gap-2.5 text-sm"}>
                          <NetworkRoutesIcon size={14} />
                          {option.network_id}
                        </div>

                        <div
                          className={
                            "text-neutral-500 mt-.5 dark:text-nb-gray-300 font-medium flex items-center gap-1 font-mono text-[10px]"
                          }
                        >
                          {option.network}
                        </div>
                        <DomainList domains={option?.domains} />
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DomainList({ domains }: { domains?: string[] }) {
  const firstDomain = domains ? domains[0] : "";
  return (
    domains &&
    domains.length > 0 && (
      <FullTooltip
        content={<div className={"text-xs max-w-sm"}>{domains.join(", ")}</div>}
      >
        <div className={"text-xs text-nb-gray-300"}>
          {firstDomain} {domains.length > 1 && "+" + (domains.length - 1)}
        </div>
      </FullTooltip>
    )
  );
}
