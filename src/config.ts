let configJson:any = "";

if (process.env.NODE_ENV !== 'production') {
  configJson = require("./.local-config.json");
  
} else {
  configJson = require("./config.json");
}

const defaultRedirectURI = '/#callback';
const defaultSilentRedirectURI = '/#silent-callback'

export function getConfig() {
  let redirectURI = defaultRedirectURI
  if (configJson.redirectURI) {
    redirectURI = configJson.redirectURI
  }

  let silentRedirectURI = defaultSilentRedirectURI
  if (configJson.silentRedirectURI) {
    silentRedirectURI = configJson.silentRedirectURI
  }

  return {
    auth0Auth: configJson.auth0Auth == "true", //due to substitution we can't use boolean in the config
    authority: configJson.authAuthority,
    clientId: configJson.authClientId,
    scopesSupported: configJson.authScopesSupported,
    apiOrigin: configJson.apiOrigin,
    grpcApiOrigin: configJson.grpcApiOrigin,
    latestVersion: configJson.latestVersion,
    audience: configJson.authAudience,
    hotjarTrackID: configJson.hotjarTrackID,
    redirectURI: redirectURI,
    silentRedirectURI: silentRedirectURI,
  };
}
