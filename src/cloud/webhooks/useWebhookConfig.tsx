import { useEffect, useMemo, useReducer, useState } from "react";
import { validator } from "@utils/helpers";
import { uniqueId } from "lodash";
import { AuthType } from "@/cloud/webhooks/WebhookAuthenticationSettings";
import {
  ActionType,
  ConfigHeader,
  httpHeadersReducer,
} from "@/cloud/webhooks/WebhookHeadersInput";

type UseWebhookConfigOptions = {
  initialUrl?: string;
  initialHeaders?: Record<string, string>;
};

export type WebhookConfig = ReturnType<typeof useWebhookConfig>;

export function useWebhookConfig({
  initialUrl = "",
  initialHeaders,
}: UseWebhookConfigOptions = {}) {
  const [url, setUrl] = useState(initialUrl);
  const [authenticationType, setAuthenticationType] = useState<string>(
    AuthType.None,
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [customAuthName, setCustomAuthName] = useState("");
  const [customAuthValue, setCustomAuthValue] = useState("");
  const [httpHeaders, setHttpHeaders] = useReducer(httpHeadersReducer, []);
  const [headerError, setHeaderError] = useState(false);
  const isEditing = !!initialUrl;

  useEffect(() => {
    if (!initialHeaders) return;
    try {
      const headersObj = { ...initialHeaders };
      const authHeader = headersObj["Authorization"];
      if (authHeader?.startsWith("Basic ")) {
        setAuthenticationType(AuthType.Basic);
        setUsername("****");
        setPassword("****");
        delete headersObj["Authorization"];
      } else if (authHeader?.startsWith("Bearer ")) {
        setAuthenticationType(AuthType.Bearer);
        setBearerToken(authHeader.substring(7));
        delete headersObj["Authorization"];
      }
      const headers = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        id: uniqueId("header"),
        error: "",
      }));
      setHttpHeaders({ type: ActionType.SET_ALL, headers });
    } catch (e) {
      /* empty */
    }
  }, []);

  const urlError = useMemo(() => {
    if (url === "") return "";
    if (!validator.isValidUrl(url)) {
      return "Please enter a valid url, e.g., https://api.example.com/webhook";
    }
    return "";
  }, [url]);

  const authHeaderConflict = useMemo(() => {
    return (
      httpHeaders.some(
        (header) => header.key.toLowerCase() === "authorization",
      ) &&
      (authenticationType === AuthType.Basic ||
        authenticationType === AuthType.Bearer)
    );
  }, [httpHeaders, authenticationType]);

  const canContinueToHeaders = useMemo(() => {
    if (!url || urlError !== "") return false;
    switch (authenticationType) {
      case AuthType.None:
        return true;
      case AuthType.Basic:
        return username !== "" && password !== "";
      case AuthType.Bearer:
        return bearerToken !== "";
      case AuthType.Custom:
        return customAuthName !== "" && customAuthValue !== "";
      default:
        return false;
    }
  }, [
    url,
    urlError,
    authenticationType,
    username,
    password,
    bearerToken,
    customAuthName,
    customAuthValue,
  ]);

  const canSave = canContinueToHeaders && !headerError && !authHeaderConflict;

  const formatHeaders = (
    options?: { undefinedOnEmpty?: boolean },
  ): Record<string, string> | undefined => {
    const headersObject = httpHeaders.reduce(
      (obj: Record<string, string>, header) => {
        if (header.key && header.value) {
          obj[header.key] = header.value;
        }
        return obj;
      },
      {},
    );
    if (authenticationType === AuthType.Basic) {
      let credentials = btoa(`${username}:${password}`);
      if (username.includes("****") || password.includes("****")) {
        credentials = "****";
      }
      headersObject["Authorization"] = `Basic ${credentials}`;
    } else if (authenticationType === AuthType.Bearer) {
      headersObject["Authorization"] = `Bearer ${bearerToken}`;
    }
    if (authenticationType === AuthType.Custom) {
      headersObject[customAuthName] = customAuthValue;
    }
    if (options?.undefinedOnEmpty && Object.keys(headersObject).length === 0) {
      return;
    }
    return headersObject;
  };

  return {
    // URL
    url,
    setUrl,
    urlError,
    // Auth
    authenticationType,
    setAuthenticationType,
    username,
    setUsername,
    password,
    setPassword,
    bearerToken,
    setBearerToken,
    customAuthName,
    setCustomAuthName,
    customAuthValue,
    setCustomAuthValue,
    // Headers
    httpHeaders,
    setHttpHeaders,
    headerError,
    setHeaderError,
    // Derived
    isEditing,
    authHeaderConflict,
    canContinueToHeaders,
    canSave,
    formatHeaders,
  };
}
