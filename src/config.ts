let configJson:any = "";

if (process.env.NODE_ENV !== 'production') {
  configJson = require("./.local-config.json");
  
} else {
  configJson = require("./config.json");
}

export function getConfig() {

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
  };
}
