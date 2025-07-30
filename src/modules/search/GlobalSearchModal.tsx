import { DropdownInput } from "@components/DropdownInput";
import Kbd from "@components/Kbd";
import { Modal, ModalContent } from "@components/modal/Modal";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import useFetchApi from "@utils/api";
import { removeAllSpaces } from "@utils/helpers";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CornerDownLeft,
  GlobeIcon,
  LayersIcon,
  NetworkIcon,
  TextSearchIcon,
  WorkflowIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Network, NetworkResource } from "@/interfaces/Network";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

enum SearchType {
  Network = "network",
  NetworkResource = "network-resource",
}

type SearchResult<T, U extends SearchType> = {
  type: U;
  id: string;
  data: T;
  onAction?: (item: T) => void;
};

type NetworkSearchResult = SearchResult<Network, SearchType.Network>;
type ResourceSearchResult = SearchResult<
  NetworkResource,
  SearchType.NetworkResource
>;
type AnySearchResult = NetworkSearchResult | ResourceSearchResult;

const searchPredicate = (item: AnySearchResult, query: string) => {
  if (!query) return false;
  const lower = removeAllSpaces(query.toLowerCase());
  const { name, description, id } = item.data;
  const find = (s: string | undefined) =>
    removeAllSpaces(s?.toLowerCase()).includes(lower);

  if (item.type === SearchType.Network) {
    if (find(name)) return true;
    if (find(description)) return true;
    if (find(id)) return true;
  }

  if (item.type === SearchType.NetworkResource) {
    if (find(name)) return true;
    if (find(description)) return true;
    if (find(item.data?.address)) return true;
    if (find(id)) return true;
  }

  return false;
};

export const GlobalSearchModal = ({ open, setOpen }: Props) => {
  return open && <GlobalSearchModalContent open={open} setOpen={setOpen} />;
};

const GlobalSearchModalContent = ({ open, setOpen }: Props) => {
  const router = useRouter();

  const { data: networks, isLoading: isNetworksLoading } = useFetchApi<
    Network[]
  >("/networks", true, false, open, {
    key: "global-search-networks",
  });
  const { data: resources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources", true, false, open, {
    key: "global-search-resources",
  });

  const findNetworkByResourceId = (resourceId: string) => {
    return networks?.find(
      (network) => network.resources?.some((res) => res === resourceId),
    );
  };

  const items: AnySearchResult[] = useMemo(() => {
    if (isNetworksLoading || isResourcesLoading) return [];
    const networkResults: NetworkSearchResult[] = (networks ?? []).map(
      (network) => ({
        type: SearchType.Network,
        id: network.id,
        data: network,
        onAction: () => router.push(`/network?id=${network.id}`),
      }),
    );

    const resourceResults: ResourceSearchResult[] = (resources ?? []).map(
      (resource) => ({
        type: SearchType.NetworkResource,
        id: resource.id,
        data: resource,
        onAction: () => {
          const network = findNetworkByResourceId(resource.id);
          if (network)
            router.push(`/network?id=${network.id}&resource=${resource.id}`);
        },
      }),
    );

    return [...networkResults, ...resourceResults];
  }, [isNetworksLoading, isResourcesLoading, networks, resources]);

  const [filteredItems, search, setSearch, setQuery, isSearching] = useSearch(
    items,
    searchPredicate,
    {
      filter: false,
      debounce: 350,
    },
  );

  const isLoading = isNetworksLoading || isResourcesLoading || isSearching;

  const networksCount = useMemo(() => {
    return filteredItems.filter((i) => i.type === SearchType.Network).length;
  }, [filteredItems]);

  const resourcesCount = useMemo(() => {
    return filteredItems.filter((i) => i.type === SearchType.NetworkResource)
      .length;
  }, [filteredItems]);

  return (
    <div>
      <Modal
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSearch("");
          setOpen(isOpen);
        }}
      >
        <ModalContent
          showClose={false}
          className={"py-0 overflow-hidden"}
          maxWidthClass={"max-w-xl"}
        >
          <DropdownInput
            hideEnterIcon={true}
            value={search}
            onChange={setSearch}
            autoFocus={true}
          />

          {search === "" && <BlankState />}

          {isLoading && search !== "" && <LoadingState />}

          {!isSearching && search !== "" && filteredItems.length === 0 && (
            <NotFoundState />
          )}

          {!isSearching && search != "" && filteredItems.length !== 0 && (
            <VirtualScrollAreaList
              items={filteredItems}
              maxHeight={400}
              scrollAreaClassName={"pt-0"}
              groupKey={(i) => i.type}
              estimatedItemHeight={48}
              estimatedHeadingHeight={32}
              heightAdjustment={5}
              onSelect={(item) => {
                const { onAction, data, type } = item;
                if (type === SearchType.Network) onAction?.(data);
                if (type === SearchType.NetworkResource) onAction?.(data);
              }}
              renderHeading={(item) => {
                return (
                  <div className={"text-xs text-nb-gray-400 px-4 py-2"}>
                    {item.type === SearchType.Network &&
                      `Networks (${networksCount})`}
                    {item.type === SearchType.NetworkResource &&
                      `Resources (${resourcesCount})`}
                  </div>
                );
              }}
              renderItem={(item) => {
                const network = findNetworkByResourceId(item.id);

                return (
                  <div className={"flex justify-between items-center w-full"}>
                    <div className={"flex justify-between items-center gap-3"}>
                      <div
                        className={
                          "h-8 w-8 bg-nb-gray-850 group-aria-selected/list-item:bg-nb-gray-700 flex items-center justify-center rounded-md"
                        }
                      >
                        {item.type === SearchType.Network && (
                          <div className={"uppercase font-medium"}>
                            {item.data.name.substring(0, 2)}
                          </div>
                        )}
                        {item.type === SearchType.NetworkResource && (
                          <ResourceIcon type={item.data.type} />
                        )}
                      </div>
                      <div>
                        <div>
                          {item.data.name} {network && ` - ${network.name}`}
                        </div>
                        <div className={"text-nb-gray-400"}>
                          {item.data.description}
                        </div>
                      </div>
                    </div>
                    <div className={"flex items-center justify-center gap-4"}>
                      {item.type === SearchType.Network && (
                        <div>
                          <div
                            className={
                              "text-[0.65rem] text-nb-gray-250 flex items-center gap-2 leading-none"
                            }
                          >
                            <LayersIcon
                              size={12}
                              className={"relative -top-[1px]"}
                            />
                            {item.data?.resources?.length} Resource(s)
                          </div>
                        </div>
                      )}
                      {item.type === SearchType.NetworkResource && (
                        <div>
                          <div
                            className={
                              "text-[0.62rem] font-mono text-nb-gray-250"
                            }
                          >
                            {item.data?.address}
                          </div>
                        </div>
                      )}
                      <div>
                        <CornerDownLeft
                          size={14}
                          className={
                            "opacity-0 group-aria-selected/list-item:opacity-100 group-list-item-aria-selected:opacity-100"
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
          <KeyboardShortcutsFooter />
        </ModalContent>
      </Modal>
    </div>
  );
};

const ResourceIcon = ({ type }: { type: NetworkResource["type"] }) => {
  const size = 14;
  switch (type) {
    case "host":
      return <WorkflowIcon size={size} />;
    case "domain":
      return <GlobeIcon size={size} />;
    case "subnet":
      return <NetworkIcon size={size} />;
    default:
      return <WorkflowIcon size={size} />;
  }
};

const BlankState = () => {
  return (
    <div className={"flex items-center justify-center pb-8"}>
      <div className={"text-center"}>
        <div className={"flex items-center justify-center mb-3 mt-3 gap-3"}>
          <div
            className={
              "bg-nb-gray-920 h-8 w-8 flex items-center justify-center rounded-md"
            }
          >
            <NetworkIcon size={16} />
          </div>
          <div
            className={
              "bg-nb-gray-920 h-8 w-8 flex items-center justify-center rounded-md"
            }
          >
            <WorkflowIcon size={16} />
          </div>
          <div
            className={
              "bg-nb-gray-920 h-8 w-8 flex items-center justify-center rounded-md"
            }
          >
            <GlobeIcon size={16} />
          </div>
        </div>

        <div className={"text-nb-gray-100 mb-1"}>
          Search for Networks and Resources
        </div>
        <div className={"text-sm text-nb-gray-350 font-light"}>
          Quickly find networks and associated resources. <br />
          Start typing to search by name, description or address.
        </div>
      </div>
    </div>
  );
};

const NotFoundState = () => {
  return (
    <div className={"flex items-center justify-center pb-8"}>
      <div className={"text-center"}>
        <div className={"flex items-center justify-center mb-3 mt-3 gap-3"}>
          <div
            className={
              "bg-nb-gray-920 h-8 w-8 flex items-center justify-center rounded-md"
            }
          >
            <TextSearchIcon size={16} />
          </div>
        </div>

        <div className={"text-nb-gray-100 mb-1"}>
          Could not find any results
        </div>
        <div className={"text-sm text-nb-gray-350 font-light max-w-xs"}>
          {`We couldn't find any results. Please try a different search term.`}
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className={"flex flex-col gap-1 px-3 mb-4 opacity-50"}>
      <Skeleton width={"100%"} height={40} />
      <Skeleton width={"100%"} height={40} />
      <Skeleton width={"100%"} height={40} />
    </div>
  );
};

const KeyboardShortcutsFooter = () => {
  return (
    <div
      className={
        "bg-nb-gray-940 border-t border-nb-gray-910 px-4 py-3 text-xs text-nb-gray-300 flex items-center gap-5"
      }
    >
      <div className={"flex items-center gap-1.5"}>
        <Kbd variant={"darker"}>
          <ArrowUpIcon size={12} />
        </Kbd>
        <Kbd variant={"darker"}>
          <ArrowDownIcon size={12} />
        </Kbd>
        <div className={"ml-1"}>Navigate</div>
      </div>
      <div className={"flex items-center gap-1.5"}>
        <Kbd variant={"darker"}>
          <CornerDownLeft size={12} />
        </Kbd>
        <div className={"ml-1"}>Open</div>
      </div>
      <div className={"flex items-center gap-1.5"}>
        <Kbd variant={"darker"} className={"text-[0.65rem] font-medium"}>
          esc
        </Kbd>
        <div className={"ml-1"}>Close</div>
      </div>
    </div>
  );
};
