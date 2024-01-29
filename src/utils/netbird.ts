import loadConfig from "@utils/config";

const config = loadConfig();
export const GRPC_API_ORIGIN = config.grpcApiOrigin;

export const getNetBirdUpCommand = () => {
  let cmd = "netbird up";
  if (!GRPC_API_ORIGIN) return cmd;
  cmd += " --management-url " + GRPC_API_ORIGIN;
  return cmd;
};

export const isNetBirdHosted = () => {
  return (
    window.location.hostname.endsWith(".netbird.io") ||
    window.location.hostname.endsWith(".wiretrustee.com")
  );
};

export const isLocalDev = () => {
  return window.location.hostname.includes("localhost");
};

export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
