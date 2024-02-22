import useFetchApi from "@utils/api";
import React, { useCallback } from "react";
import { Country } from "@/interfaces/Country";
import { Peer } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
};

const CountryContext = React.createContext(
  {} as {
    countries: Country[] | undefined;
    isLoading: boolean;
    getRegionByPeer: (peer: Peer) => string;
  },
);

export default function CountryProvider({ children }: Props) {
  const { data: countries, isLoading } = useFetchApi<Country[]>(
    "/locations/countries",
  );

  const getRegionByPeer = useCallback(
    (peer: Peer) => {
      if (!countries) return "Unknown";
      const country = countries.find(
        (c) => c.country_code === peer.country_code,
      );
      if (!country) return "Unknown";
      if (!peer.city_name) return country.country_name;
      return `${country.country_name}, ${peer.city_name}`;
    },
    [countries],
  );

  return (
    <CountryContext.Provider value={{ countries, isLoading, getRegionByPeer }}>
      {children}
    </CountryContext.Provider>
  );
}

export const useCountries = () => {
  return React.useContext(CountryContext);
};
