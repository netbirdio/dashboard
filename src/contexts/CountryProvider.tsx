import useFetchApi from "@utils/api";
import React, { useCallback } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
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
    getRegionText: (country_code: string, city_name: string) => string;
  },
);

export default function CountryProvider({ children }: Props) {
  const { isRestricted } = usePermissions();

  const getRegionByPeer = (peer: Peer) => "Unknown";
  const getRegionText = (country_code: string, city_name: string) => "Unknown";

  return isRestricted ? (
    <CountryContext.Provider
      value={{
        countries: [],
        isLoading: false,
        getRegionByPeer,
        getRegionText,
      }}
    >
      {children}
    </CountryContext.Provider>
  ) : (
    <CountryProviderContent>{children}</CountryProviderContent>
  );
}

function CountryProviderContent({ children }: Props) {
  const { data: countries, isLoading } = useFetchApi<Country[]>(
    "/locations/countries",
    true,
    false,
  );

  const getRegionText = useCallback(
    (country_code: string, city_name: string) => {
      if (!countries) return "Unknown";
      const country = countries.find((c) => c.country_code === country_code);
      if (!country) return "Unknown";
      if (!city_name) return country.country_name;
      return `${country.country_name}, ${city_name}`;
    },
    [countries],
  );

  const getRegionByPeer = useCallback(
    (peer: Peer) => {
      return getRegionText(peer.country_code, peer.city_name);
    },
    [getRegionText],
  );

  return (
    <CountryContext.Provider
      value={{ countries, isLoading, getRegionByPeer, getRegionText }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export const useCountries = () => {
  return React.useContext(CountryContext);
};
