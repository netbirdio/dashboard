import { SelectOption } from "@components/select/SelectDropdown";

export interface PostureCheck {
  id: string;
  name: string;
  description?: string;
  checks: {
    nb_version_check?: NetBirdVersionCheck;
    os_version_check?: OperatingSystemVersionCheck;
    geo_location_check?: GeoLocationCheck;
  };
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

export const windowsKernelVersions: SelectOption[] = [
  { value: "5.0", label: "Windows 2000" },
  { value: "5.1", label: "Windows XP" },
  { value: "6.0", label: "Windows Vista" },
  { value: "6.1", label: "Windows 7" },
  { value: "6.2", label: "Windows 8" },
  { value: "6.3", label: "Windows 8.1" },
  { value: "10.0", label: "Windows 10" },
  { value: "10.0.2", label: "Windows 11" },
];

export const iOSVersions: SelectOption[] = [
  { value: "1.0", label: "iPhone OS 1.x" },
  { value: "2.0", label: "iPhone OS 2.x" },
  { value: "3.0", label: "iPhone OS 3.x" },
  { value: "4.0", label: "iOS 4.x" },
  { value: "5.0", label: "iOS 5.x" },
  { value: "6.0", label: "iOS 6.x" },
  { value: "7.0", label: "iOS 7.x" },
  { value: "8.0", label: "iOS 8.x" },
  { value: "9.0", label: "iOS 9.x" },
  { value: "10.0", label: "iOS 10.x" },
  { value: "11.0", label: "iOS 11.x" },
  { value: "12.0", label: "iOS 12.x" },
  { value: "13.0", label: "iOS 13.x" },
  { value: "14.0", label: "iOS 14.x" },
  { value: "15.0", label: "iOS 15.x" },
  { value: "16.0", label: "iOS 16.x" },
  { value: "17.0", label: "iOS 17.x" },
];

export const macOSVersions: SelectOption[] = [
  { value: "10.0", label: "Mac OS X Cheetah" },
  { value: "10.1", label: "Mac OS X Puma" },
  { value: "10.2", label: "Mac OS X Jaguar" },
  { value: "10.3", label: "Mac OS X Panther" },
  { value: "10.4", label: "Mac OS X Tiger" },
  { value: "10.5", label: "Mac OS X Leopard" },
  { value: "10.6", label: "Mac OS X Snow Leopard" },
  { value: "10.7", label: "Mac OS X Lion" },
  { value: "10.8", label: "OS X Mountain Lion" },
  { value: "10.9", label: "OS X Mavericks" },
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
];

export const androidVersions: SelectOption[] = [
  { value: "1.5", label: "Android Cupcake" },
  { value: "1.6", label: "Android Donut" },
  { value: "2.0", label: "Android Eclair" },
  { value: "2.2", label: "Android Froyo" },
  { value: "2.3", label: "Android Gingerbread" },
  { value: "3.0", label: "Android Honeycomb" },
  { value: "4.0", label: "Android Ice Cream Sandwich" },
  { value: "4.1", label: "Android Jelly Bean" },
  { value: "4.4", label: "Android KitKat" },
  { value: "5.0", label: "Android Lollipop" },
  { value: "6.0", label: "Android Marshmallow" },
  { value: "7.0", label: "Android Nougat" },
  { value: "8.0", label: "Android Oreo" },
  { value: "9.0", label: "Android Pie" },
  { value: "10", label: "Android 10" },
  { value: "11", label: "Android 11" },
  { value: "12", label: "Android 12" },
  { value: "13", label: "Android 13" },
  { value: "14", label: "Android 14" },
  { value: "15", label: "Android 15" },
];
