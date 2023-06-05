let configJson:any = "";

if (process.env.NODE_ENV !== 'production') {
  configJson = require("./.local-config.json");
  
} else {
  configJson = require("./config.json");
}

const defaultRedirectURI = '/#callback';
const defaultSilentRedirectURI = '/#silent-callback'
const defaultTokenSource = "accessToken"
export function getConfig() {
  let redirectURI = defaultRedirectURI
  if (configJson.redirectURI) {
    redirectURI = configJson.redirectURI
  }

  let silentRedirectURI = defaultSilentRedirectURI
  if (configJson.silentRedirectURI) {
    silentRedirectURI = configJson.silentRedirectURI
  }

  let tokenSource = defaultTokenSource
  if (configJson.tokenSource) {
    tokenSource = configJson.tokenSource
  }

  return {
    auth0Auth: configJson.auth0Auth == "true", //due to substitution we can't use boolean in the config
    authority: configJson.authAuthority,
    clientId: configJson.authClientId,
    clientSecret: configJson.authClientSecret,
    scopesSupported: configJson.authScopesSupported,
    apiOrigin: configJson.apiOrigin,
    grpcApiOrigin: configJson.grpcApiOrigin,
    audience: configJson.authAudience,
    hotjarTrackID: configJson.hotjarTrackID,
    redirectURI: redirectURI,
    silentRedirectURI: silentRedirectURI,
    tokenSource: tokenSource,
  };
}
