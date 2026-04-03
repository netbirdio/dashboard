import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { createElement, useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";

type Props = {
  value: string;
  onChange: (value: string) => void;
  iconSize?: number;
  popoverWidth?: "auto" | "content" | number;
  truncate?: boolean;
};
export const CountrySelector = ({ value, onChange, iconSize = 20, popoverWidth, truncate }: Props) => {
  const { countries, isLoading } = useCountries();

  const countryList = useMemo(() => {
    return countries?.map((country) => {
      const flag = (props: {
        size?: number;
        width?: number;
        country?: string;
      }) =>
        createElement(RoundedFlag, {
          country: country.country_code,
          size: iconSize,
          ...props,
        });
      return {
        label: country.country_name + " (" + country.country_code + ")",
        value: country.country_code,
        icon: flag,
      } as SelectOption;
    }) as SelectOption[];
  }, [countries]);

  return (
    <div className={"block w-full"}>
      <SelectDropdown
        isLoading={isLoading}
        showSearch={true}
        placeholder={"Select country..."}
        searchPlaceholder={"Search country..."}
        value={value}
        onChange={onChange}
        iconSize={iconSize}
        options={countryList || []}
        popoverWidth={popoverWidth}
        truncate={truncate}
      />
    </div>
  );
};
