let configJson:any = "";

if (process.env.NODE_ENV !== 'production') {
  configJson = require("./.local-config.json");

} else {
  configJson = require("./config.json");
}

const defaultRedirectURI = '/#callback';
const defaultSilentRedirectURI = '/#silent-callback'
const defaultClientSecret = '';
const defaultTokenType = 'access'; // Allow setting if we need to use the Access Token or Id token returned from the IDP

export function getConfig() {
  let redirectURI = defaultRedirectURI
  if (configJson.redirectURI) {
    redirectURI = configJson.redirectURI
  }

  let silentRedirectURI = defaultSilentRedirectURI
  if (configJson.silentRedirectURI) {
    silentRedirectURI = configJson.silentRedirectURI
  }

  let clientSecret = defaultClientSecret
  if (configJson.authClientSecret) {
    clientSecret = configJson.authClientSecret
  }

  let tokenType = defaultTokenType
  if (configJson.tokenType) {
    tokenType = configJson.tokenType
  }

  return {
    auth0Auth: configJson.auth0Auth == "true", //due to substitution we can't use boolean in the config
    authority: configJson.authAuthority,
    clientId: configJson.authClientId,
    clientSecret: clientSecret,
    scopesSupported: configJson.authScopesSupported,
    apiOrigin: configJson.apiOrigin,
    grpcApiOrigin: configJson.grpcApiOrigin,
    latestVersion: configJson.latestVersion,
    audience: configJson.authAudience,
    hotjarTrackID: configJson.hotjarTrackID,
    redirectURI: redirectURI,
    silentRedirectURI: silentRedirectURI,
    tokenType: tokenType,
  };
}
