import { CountryEURounded } from "@/assets/countries/CountryEURounded";
import { CountryJPRounded } from "@/assets/countries/CountryJPRounded";
import { CountryUSRounded } from "@/assets/countries/CountryUSRounded";

export const DatadogRegions = [
  {
    name: "Europe (EU)",
    site_url: "https://app.datadoghq.eu",
    send_logs_url: "https://http-intake.logs.datadoghq.eu/api/v2/logs",
    icon: CountryEURounded,
  },
  {
    name: "United States (US1)",
    site_url: "https://app.datadoghq.com",
    send_logs_url: "https://http-intake.logs.datadoghq.com/api/v2/logs",
    icon: CountryUSRounded,
  },
  {
    name: "United States (US3)",
    site_url: "https://us3.datadoghq.com",
    send_logs_url: "https://http-intake.logs.us3.datadoghq.com/api/v2/logs",
    icon: CountryUSRounded,
  },
  {
    name: "United States (US5)",
    site_url: "https://us5.datadoghq.com",
    send_logs_url: "https://http-intake.logs.us5.datadoghq.com/api/v2/logs",
    icon: CountryUSRounded,
  },
  {
    name: "United States (US1-FED)",
    site_url: "https://app.ddog-gov.com",
    send_logs_url: "https://http-intake.logs.ddog-gov.com/api/v2/logs",
    icon: CountryUSRounded,
  },
  {
    name: "Japan (AP1)",
    site_url: "https://ap1.datadoghq.com",
    send_logs_url: "https://http-intake.logs.ap1.datadoghq.com/api/v2/logs",
    icon: CountryJPRounded,
  },
] as const;

export const DatadogApiKeysPage = "/organization-settings/api-keys";
