import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import { MapPin } from "lucide-react";
import { createElement, useMemo } from "react";
import { City } from "@/interfaces/City";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  value: string;
  onChange: (value: string) => void;
  country: string;
};
export const CitySelector = ({ value, onChange, country = "de" }: Props) => {
  const { t } = useI18n();
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

    all.unshift({ label: t("citySelector.allLocations"), value: "", icon: pinIcon });
    return all;
  }, [cities]);

  return (
    <div className={"block w-full"}>
      <SelectDropdown
        isLoading={isLoading}
        showSearch={true}
        placeholder={t("citySelector.placeholder")}
        searchPlaceholder={t("citySelector.searchPlaceholder")}
        value={value}
        onChange={onChange}
        options={cityList || []}
      />
    </div>
  );
};
