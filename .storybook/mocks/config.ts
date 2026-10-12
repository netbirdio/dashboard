/* Replaces the deployment config.json (see mockConfigPlugin in main.ts).
   The cloud flavour can't change after load, because the dashboard reads
   its config once at import time, so it comes from the `flavor` global in
   the iframe URL; the toolbar switch reloads the preview. */
const cloud = /flavor:cloud/.test(
  new URLSearchParams(location.search).get("globals") ?? "",
);

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
  agentNetworkEnabled: "true",
  hubspotPortalId: "",
  hubspotSignupFormId: "",
  hubspotOnboardingFormId: "",
  hubspotSurveyFormId: "",
  analyticsExcludedEmails: "",
  announcement: "",
};

export default config;
