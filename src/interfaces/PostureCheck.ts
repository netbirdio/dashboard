import { SelectOption } from "@components/select/SelectDropdown";
import { Policy } from "@/interfaces/Policy";

export interface PostureCheck {
  id: string;
  name: string;
  description?: string;
  checks: {
    nb_version_check?: NetBirdVersionCheck;
    os_version_check?: OperatingSystemVersionCheck;
    geo_location_check?: GeoLocationCheck;
    peer_network_range_check?: PeerNetworkRangeCheck;
    process_check?: ProcessCheck;
  };
  policies?: Policy[];
  active?: boolean;
}

export interface NetBirdVersionCheck {
  min_version: string;
}

export interface OperatingSystemVersionCheck {
  android?: {
    min_version: string;
  };
  darwin?: {
    min_version: string;
  };
  ios?: {
    min_version: string;
  };
  linux?: {
    min_kernel_version: string;
  };
  windows?: {
    min_kernel_version: string;
  };
}

export interface GeoLocationCheck {
  locations: GeoLocation[];
  action: "allow" | "deny";
}

export interface GeoLocation {
  id: string;
  country_code: string;
  city_name: string;
}

export interface PeerNetworkRangeCheck {
  ranges: string[];
  action: "allow" | "deny";
}

export interface ProcessCheck {
  processes: Process[];
}

export interface Process {
  id: string;
  linux_path?: string;
  mac_path?: string;
  windows_path?: string;
}

export const windowsKernelVersions: SelectOption[] = [
  { value: "10.0", label: "Windows 10" },
  { value: "10.0.2", label: "Windows 11" },
];

export const iOSVersions: SelectOption[] = [
  { value: "14.0", label: "iOS 14.x" },
  { value: "15.0", label: "iOS 15.x" },
  { value: "16.0", label: "iOS 16.x" },
  { value: "17.0", label: "iOS 17.x" },
  { value: "18.0", label: "iOS 18.x" },
];

export const macOSVersions: SelectOption[] = [
  { value: "10.10", label: "OS X Yosemite" },
  { value: "10.11", label: "OS X El Capitan" },
  { value: "10.12", label: "macOS Sierra" },
  { value: "10.13", label: "macOS High Sierra" },
  { value: "10.14", label: "macOS Mojave" },
  { value: "10.15", label: "macOS Catalina" },
  { value: "11.0", label: "macOS Big Sur" },
  { value: "12.0", label: "macOS Monterey" },
  { value: "13.0", label: "macOS Ventura" },
  { value: "14.0", label: "macOS Sonoma" },
  { value: "15.0", label: "macOS Sequoia" },
];

export const androidVersions: SelectOption[] = [
  { value: "8.0", label: "Android Oreo" },
  { value: "9.0", label: "Android Pie" },
  { value: "10", label: "Android 10" },
  { value: "11", label: "Android 11" },
  { value: "12", label: "Android 12" },
  { value: "13", label: "Android 13" },
  { value: "14", label: "Android 14" },
  { value: "15", label: "Android 15" },
  { value: "16", label: "Android 16" },
];
