import loadConfig from "@utils/config";

const config = loadConfig();
export const GRPC_API_ORIGIN = config.grpcApiOrigin;

export const getNetBirdUpCommand = () => {
  let cmd = "netbird up";
  if (GRPC_API_ORIGIN) {
    cmd += " --management-url " + GRPC_API_ORIGIN;
  }
  return cmd;
};

export const getInstallUrl = () => {
  return window.location.origin + "/install";
};

export const isNetBirdHosted = () => {
  const hostname = window.location.hostname;
  if (hostname.includes("selfhosted")) return false;
  return hostname.endsWith(".netbird.io") || hostname.endsWith(".wiretrustee.com");
};

export const isLocalDev = () => {
  return window.location.hostname.includes("localhost");
};

export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
