import { SelectOption } from "@components/select/SelectDropdown";
import RoundedFlag from "@/assets/countries/RoundedFlag";

export const CrowdStrikeRegions = [
  {
    name: "Europe (EU-1)",
    cloud_id: "eu-1",
    site: "https://falcon.eu-1.crowdstrike.com",
    icon: () => <RoundedFlag country="eu" />,
  },
  {
    name: "United States (US-1)",
    site: "https://falcon.crowdstrike.com",
    cloud_id: "us-1",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "United States (US-2)",
    site: "https://falcon.us-2.crowdstrike.com",
    cloud_id: "us-2",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "United States (US-GOV-1)",
    site: "https://falcon.laggar.gcw.crowdstrike.com",
    cloud_id: "us-gov-1",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "United States (US-GOV-2)",
    site: "https://falcon.us-gov-2.crowdstrike.mil",
    cloud_id: "us-gov-2",
    icon: () => <RoundedFlag country="us" />,
  },
] as const;

export const CrowdStrikeRegionsData = CrowdStrikeRegions.map((region) => {
  return {
    label: region.name,
    value: region.cloud_id,
    icon: region.icon,
  } as SelectOption;
});
