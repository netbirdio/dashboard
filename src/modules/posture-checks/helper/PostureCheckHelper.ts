import {
  GeoLocation,
  GeoLocationCheck,
  OperatingSystemVersionCheck,
} from "@/interfaces/PostureCheck";

export const validateOSCheck = (osCheck?: OperatingSystemVersionCheck) => {
  if (!osCheck) return;
  const os = osCheck;
  if (os.darwin && os.darwin.min_version == "") os.darwin.min_version = "0";
  if (os.android && os.android.min_version == "") os.android.min_version = "0";
  if (os.windows && os.windows.min_kernel_version == "")
    os.windows.min_kernel_version = "0";
  if (os.linux && os.linux.min_kernel_version == "")
    os.linux.min_kernel_version = "0";
  if (os.ios && os.ios.min_version == "") os.ios.min_version = "0";
  return os;
};

export const validateLocationCheck = (locationCheck?: GeoLocationCheck) => {
  if (!locationCheck) return;
  if (!locationCheck.locations) return;
  return {
    action: locationCheck.action,
    locations: locationCheck.locations.map((location) => {
      if (location.city_name == "")
        return { country_code: location.country_code } as GeoLocation;
      return {
        country_code: location.country_code,
        city_name: location.city_name,
      } as GeoLocation;
    }),
  } as GeoLocationCheck;
};
