/* Replaces the deployment config.json (see mockConfigPlugin in main.ts).
   The cloud flavour can't change after load, because the dashboard reads
   its config once at import time, so it comes from the `flavor` global in
   the iframe URL; the toolbar switch reloads the preview. */
const globals = new URLSearchParams(location.search).get("globals") ?? "";
const cloud = /flavor:cloud/.test(globals);
/* A deployment without Agent Network, read the same way: the
   `agent-network-off` story tag or the toolbar switch sets it. */
const agentNetworkOff = /agentNetwork:off/.test(globals);

const config = {
  auth0Auth: "false",
  authAuthority: "https://auth.storybook.test",
  authClientId: "storybook",
  authClientSecret: "",
  authScopesSupported: "openid profile email",
  authAudience: "storybook",
  apiOrigin: "https://api.storybook.test",
  grpcApiOrigin: "https://api.storybook.test",
  redirectURI: "",
  silentRedirectURI: "",
  tokenSource: "accessToken",
  dragQueryParams: "false",
  hotjarTrackID: "",
  googleAnalyticsID: "",
  googleTagManagerID: "",
  authServiceUrl: cloud ? "https://api.storybook.test" : "",
  wasmPath: "",
  licensed: cloud ? "true" : "false",
  cloud: cloud ? "true" : "false",
  agentNetworkOnly: "false",
  agentNetworkEnabled: agentNetworkOff ? "false" : "true",
  hubspotPortalId: "",
  hubspotSignupFormId: "",
  hubspotOnboardingFormId: "",
  hubspotSurveyFormId: "",
  matomoUrl: "",
  matomoSiteId: "",
  analyticsExcludedEmails: "",
  announcement: "",
};

export default config;
