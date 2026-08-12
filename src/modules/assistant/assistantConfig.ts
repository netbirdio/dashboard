/**
 * Where the assistant server lives. Follows the dashboard's config.json
 * substitution pattern (see @utils/config) rather than build-time env vars, so
 * the same image can point at a different assistant per deployment.
 */
const loadAssistantConfig = () => {
  let configJson: any = {};
  try {
    if (process.env.APP_ENV === "test") {
      configJson = require("@/config/test");
    } else if (process.env.NODE_ENV === "development") {
      configJson = require("@/config/local");
    } else {
      configJson = require("@/config/production");
    }
  } catch {
    // Missing config file — fall back to the dev default below.
  }

  const origin = (
    configJson?.assistantApiOrigin || "http://localhost:8787"
  ).replace(/\/+$/, "");

  return {
    origin,
    /** Feature flag: hide the launcher entirely when the assistant isn't deployed. */
    enabled: configJson?.assistantEnabled !== "false",
  };
};

export default loadAssistantConfig;
