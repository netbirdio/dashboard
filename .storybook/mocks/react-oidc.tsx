import React from "react";

/* Stands in for @axa-fr/react-oidc (aliased in main.ts): always logged in
   as the owner, so dashboard pages render without an identity provider. */

const encode = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const claims = {
  sub: "user-owner",
  email: "owner@netbird.io",
  name: "Olivia Owner",
  iat: 1790000000,
  exp: 4102444800,
};
const token = `${encode({ alg: "none", typ: "JWT" })}.${encode(claims)}.`;

export const OidcProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
export const OidcSecure = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export const useOidc = () => ({
  isAuthenticated: true,
  login: async () => undefined,
  logout: async () => undefined,
  renewTokens: async () => undefined,
});
export const useOidcAccessToken = () => ({
  accessToken: token,
  accessTokenPayload: claims,
});
export const useOidcIdToken = () => ({
  idToken: token,
  idTokenPayload: claims,
});
export const useOidcUser = () => ({
  oidcUser: claims,
  oidcUserLoadingState: "User loaded",
  reloadOidcUser: () => undefined,
});
