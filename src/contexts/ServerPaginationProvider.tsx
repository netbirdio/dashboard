"use client";

import useFetchApi from "@utils/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { Pagination } from "@/interfaces/Pagination";

type ServerPaginationContextValue<T = unknown> = {
  data?: T;
  isLoading: boolean;
  isFetching: boolean;
  mutate: () => Promise<unknown>;

  pagination: { pageIndex: number; pageSize: number };
  pageCount: number;
  totalRecords?: number;
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;

  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  getFilter: (key: string) => string | undefined;
  setSort: (name: string, direction: "asc" | "desc") => void;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  onFilterReset: () => void;

  hasServerSideFilters: boolean;
  serverSidePagination: true;
  manualPagination: true;
  manualFiltering: true;
  keepStateInLocalStorage: false;
};

const ServerPaginationContext =
  createContext<ServerPaginationContextValue | null>(null);

type ProviderProps = {
  url: string;
  defaultPageSize?: number;
  defaultFilters?: Record<string, string>;
  children: React.ReactNode;
};

export default function ServerPaginationProvider({
  url,
  defaultPageSize = 50,
  defaultFilters,
  children,
}: Readonly<ProviderProps>) {
  const { mutate: swrMutate } = useSWRConfig();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    defaultFilters ?? {},
  );

  const buildUrl = useCallback(
    (
      p: number,
      ps: number,
      s: string,
      f: Record<string, string | undefined>,
    ) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("page_size", String(ps));
      if (s) params.set("search", s.toLowerCase());
      Object.entries(f).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, value);
      });
      return `${url}?${params.toString()}`;
    },
    [url],
  );

  const apiUrl = buildUrl(page, pageSize, search, filters);

  const {
    data: response,
    isLoading,
    isValidating,
  } = useFetchApi<Pagination<unknown>>(apiUrl);

  const hasLoadedOnce = useRef(false);
  const previousResponse = useRef<Pagination<unknown> | undefined>(undefined);
  if (response?.data) {
    hasLoadedOnce.current = true;
    previousResponse.current = response;
  }

  const activeResponse = response ?? previousResponse.current;
  const totalPages = activeResponse?.total_pages ?? 0;
  const hasNextPage = page < totalPages;

  // Prefetch next page
  useFetchApi<Pagination<unknown>>(
    hasNextPage ? buildUrl(page + 1, pageSize, search, filters) : apiUrl,
    false,
    false,
    hasNextPage,
  );

  const onPaginationChange = useCallback(
    (pagination: { pageIndex: number; pageSize: number }) => {
      if (pagination.pageSize !== pageSize) {
        setPage(1);
        setPageSize(pagination.pageSize);
      } else {
        setPage(pagination.pageIndex + 1);
      }
    },
    [pageSize],
  );

  const onGlobalFilterChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const filterTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingFilters = useRef<Record<string, string | undefined>>({});
  useEffect(() => () => clearTimeout(filterTimeout.current), []);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    pendingFilters.current[key] = value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      const pending = pendingFilters.current;
      pendingFilters.current = {};
      setFilters((prev) => ({ ...prev, ...pending }));
      setPage(1);
    }, 100);
  }, []);

  const getFilter = useCallback((key: string) => filters[key], [filters]);

  const setSort = useCallback(
    (name: string, direction: "asc" | "desc") => {
      setFilters((prev) => ({
        ...prev,
        sort_by: name,
        sort_order: direction,
      }));
      setPage(1);
    },
    [],
  );

  const hasActiveFilters =
    search !== "" ||
    Object.entries(filters).some(
      ([key, value]) => value !== (defaultFilters ?? {})[key],
    );

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilters(defaultFilters ?? {});
    setPage(1);
  }, [defaultFilters]);

  const mutate = useCallback(() => {
    return swrMutate(apiUrl);
  }, [swrMutate, apiUrl]);

  const value = useMemo<ServerPaginationContextValue>(
    () => ({
      data: activeResponse?.data,
      isLoading: isLoading && !hasLoadedOnce.current,
      isFetching: isValidating,
      mutate,
      setFilter,
      getFilter,
      setSort,
      hasActiveFilters,
      resetFilters,
      pagination: { pageIndex: page - 1, pageSize },
      pageCount: totalPages,
      totalRecords: activeResponse?.total_records,
      onPaginationChange,
      manualPagination: true,
      serverSidePagination: true,
      manualFiltering: true,
      keepStateInLocalStorage: false,
      globalFilter: search,
      onGlobalFilterChange,
      onFilterReset: resetFilters,
      hasServerSideFilters: hasActiveFilters,
    }),
    [
      activeResponse?.data,
      activeResponse?.total_records,
      isLoading,
      isValidating,
      mutate,
      setFilter,
      getFilter,
      setSort,
      hasActiveFilters,
      resetFilters,
      page,
      pageSize,
      totalPages,
      onPaginationChange,
      search,
      onGlobalFilterChange,
    ],
  );

  return (
    <ServerPaginationContext.Provider value={value}>
      {children}
    </ServerPaginationContext.Provider>
  );
}

export function useServerPagination<T>() {
  const context = useContext(ServerPaginationContext);
  if (!context) {
    throw new Error(
      "useServerPagination must be used within a ServerPaginationProvider",
    );
  }
  return context as ServerPaginationContextValue<T>;
}
