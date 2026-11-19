import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import { MapPin } from "lucide-react";
import { createElement, useMemo } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { City } from "@/interfaces/City";

type Props = {
  value: string;
  onChange: (value: string) => void;
  country: string;
};
export const CitySelector = ({ value, onChange, country = "de" }: Props) => {
  const t = useTranslations();
  const { data: cities, isLoading } = useFetchApi<City[]>(
    `/locations/countries/${country}/cities`,
  );

  const cityList = useMemo(() => {
    const pinIcon = (props: {
      size?: number;
      width?: number;
      country?: string;
    }) =>
      createElement(MapPin, {
        ...props,
      });
    if (!cities) return [];

    const all = cities?.map((city) => {
      return {
        label: city.city_name,
        value: city.city_name,
        icon: pinIcon,
      } as SelectOption;
    }) as SelectOption[];

    all.unshift({
      label: t("components.allLocations"),
      value: "",
      icon: pinIcon,
    });
    return all;
  }, [cities, t]);

  return (
    <div className={"block w-full"}>
      <SelectDropdown
        isLoading={isLoading}
        showSearch={true}
        placeholder={t("components.selectCityOptional")}
        searchPlaceholder={t("components.searchCity")}
        value={value}
        onChange={onChange}
        options={cityList || []}
      />
    </div>
  );
};
