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
    getRegionText: (
      country_code: string,
      city_name: string,
      subdivision_code?: string,
    ) => string;
  },
);

export default function CountryProvider({ children }: Props) {
  const { isRestricted } = usePermissions();

  const getRegionByPeer = (peer: Peer) => "Unknown";
  const getRegionText = (
    country_code: string,
    city_name: string,
    subdivision_code?: string,
  ) => "Unknown";

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
    (country_code: string, city_name: string, subdivision_code?: string) => {
      if (!countries) return "Unknown";
      const country = countries.find((c) => c.country_code === country_code);
      if (!country) return "Unknown";
      const parts = [country.country_name];
      if (subdivision_code) parts.push(subdivision_code);
      if (city_name) parts.push(city_name);
      return parts.join(", ");
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
