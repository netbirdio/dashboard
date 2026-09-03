import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { createElement, useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";

// browserCountryCode returns the ISO 3166-1 alpha-2 region from the browser's
// preferred languages (e.g. "en-US" -> "US"), or undefined when none carries a
// region. It reads navigator.languages, so it is client-only.
function browserCountryCode(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of langs) {
    if (!lang) continue;
    try {
      const region = new Intl.Locale(lang).region;
      if (region) return region.toUpperCase();
    } catch {
      // Ignore malformed language tags and try the next one.
    }
  }
  return undefined;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  iconSize?: number;
  popoverWidth?: "auto" | "content" | number;
  truncate?: boolean;
};
export const CountrySelector = ({
  value,
  onChange,
  iconSize = 20,
  popoverWidth,
  truncate,
}: Props) => {
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

  // Surface the browser-detected country at the top so the common case is one
  // click away. Falls back to the original order when detection fails or the
  // code is not in the list.
  const orderedList = useMemo(() => {
    if (!countryList?.length) return countryList;
    const code = browserCountryCode();
    if (!code) return countryList;
    const index = countryList.findIndex((option) => option.value === code);
    if (index <= 0) return countryList;
    const reordered = countryList.slice();
    const [detected] = reordered.splice(index, 1);
    return [detected, ...reordered];
  }, [countryList]);

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
        options={orderedList || []}
        popoverWidth={popoverWidth}
        truncate={truncate}
      />
    </div>
  );
};
