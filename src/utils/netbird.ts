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

export type Edition = "cloud" | "licensed" | "oss";

// testEditionOverride lets e2e tests drive cloud/licensed/oss behavior against
// the test build by setting localStorage. It is inert outside test builds,
// where the APP_ENV check is replaced at compile time and tree-shaken away.
export const testEditionOverride = (): Edition | undefined => {
  if (process.env.APP_ENV !== "test") return undefined;
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem("netbird-test-edition");
    if (value === "cloud" || value === "licensed" || value === "oss") {
      return value;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// isNetBirdCloud returns true when the dashboard runs on the NetBird-managed
// cloud infrastructure (billing, MSP, trial, hosted integrations).
// The hostname fallback keeps deployments without NETBIRD_CLOUD working.
export const isNetBirdCloud = () => {
  const override = testEditionOverride();
  if (override) return override === "cloud";
  if (process.env.APP_ENV === "test") return true;
  if (config.cloud) return true;
  const hostname = window.location.hostname;
  if (hostname.includes("selfhosted")) return false;
  return (
    hostname.endsWith(".netbird.io") || hostname.endsWith(".wiretrustee.com")
  );
};

// hasLicensedFlag returns true when the deployment declares a self-hosted
// license via NETBIRD_LICENSED. Cloud is always licensed. Deployments without
// the flag are detected at runtime via useIsLicensed.
export const hasLicensedFlag = () => {
  const override = testEditionOverride();
  if (override) return override !== "oss";
  return config.licensed || isNetBirdCloud();
};

// isAgentNetworkOnly returns true for the dedicated Agent Network surface:
// the regular UI (network routing, DNS, reverse proxy, activity) is hidden and
// the Agent Network menu shows without a Beta badge.
export const isAgentNetworkOnly = () => {
  return config.agentNetworkOnly;
};

// isAgentNetworkEnabled returns true when the Agent Network product surface
// (Providers, Policies, Usage & Logs) is available — in either the dedicated
// "only" mode or alongside the regular UI (where it carries a Beta badge).
export const isAgentNetworkEnabled = () => {
  return config.agentNetworkEnabled || config.agentNetworkOnly;
};

export const isAuth0 = () => {
  return config.auth0Auth;
};

export const isLocalDev = () => {
  return window.location.hostname.includes("localhost");
};

export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
