import { debounce as lodashDebounce, isEqual } from "lodash";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import usePrevious from "./usePrevious";

export type Predicate<T> = (item: T, query: string) => boolean;

export interface Options {
  initialQuery?: string;
  filter?: boolean;
  debounce?: number;
}

function filterCollection<T>(
  collection: T[],
  predicate: Predicate<T>,
  query: string,
  filter: boolean,
): T[] {
  if (query) {
    return collection.filter((item) => predicate(item, query));
  } else {
    return filter ? collection : [];
  }
}

export function useSearch<T>(
  collection: T[],
  predicate: Predicate<T>,
  { debounce, filter = false, initialQuery = "" }: Options = {},
): [
  T[],
  string,
  (event: ChangeEvent<HTMLInputElement> | string) => void,
  (querty: string) => void,
] {
  const isMounted = useRef<boolean>(false);
  const [query, setQuery] = useState<string>(initialQuery);
  const prevCollection = usePrevious(collection);
  const prevPredicate = usePrevious(predicate);
  const prevQuery = usePrevious(query);
  const prevFilter = usePrevious(filter);
  const [filteredCollection, setFilteredCollection] = useState<T[]>(() =>
    filterCollection<T>(collection, predicate, query, filter),
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement> | string) => {
      setQuery(typeof event === "string" ? event : event.target.value);
    },
    [setQuery],
  );

  const debouncedFilterCollection = useCallback(
    lodashDebounce(
      (
        collection: T[],
        predicate: Predicate<T>,
        query: string,
        filter: boolean,
      ) => {
        if (isMounted.current) {
          setFilteredCollection(
            filterCollection(collection, predicate, query, filter),
          );
        }
      },
      debounce,
    ),
    [debounce],
  );

  useEffect(() => {
    if (
      !isEqual(collection, prevCollection) ||
      !isEqual(predicate, prevPredicate) ||
      !isEqual(query, prevQuery) ||
      !isEqual(filter, prevFilter)
    )
      debouncedFilterCollection(collection, predicate, query, filter);
  }, [collection, predicate, query, filter]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return [filteredCollection, query, handleChange, setQuery];
}
