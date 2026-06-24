"use client";

import useFetchApi from "@utils/api";
import { useMemo } from "react";

export type CatalogModel = {
  id: string;
  label: string;
  input_per_1k: number;
  output_per_1k: number;
  context_window: number;
};

export type CatalogProviderKind = "provider" | "gateway" | "custom";

export type CatalogProvider = {
  id: string;
  name: string;
  description: string;
  default_host: string;
  auth_header_template: string;
  default_content_type: string;
  brand_color: string;
  // Presentation grouping for the provider Select. "provider" =
  // first-party vendor API (OpenAI, Anthropic, …); "gateway" =
  // routing layer in front of multiple providers (LiteLLM, Portkey,
  // …); "custom" = OpenAI-compatible self-hosted catch-all.
  kind: CatalogProviderKind;
  // extra_headers, when present, surfaces optional inputs on the
  // provider modal — one input per entry. Operator-typed values land
  // on the provider record's extra_values map keyed by `name` and
  // are stamped on every upstream request. Used by gateways like
  // Portkey for x-portkey-config (saved-config id).
  extra_headers?: CatalogExtraHeader[];
  // identity_injection, when set with header_pair.customizable=true,
  // tells the provider modal to surface two extra inputs (one per
  // identity dimension) for the operator to pick wire header names.
  // The header_pair.end_user_id_header / tags_header values are the
  // catalog defaults used as placeholders; the actual values stamped
  // come from the provider record's identityHeaderUserId /
  // identityHeaderGroups fields. Used today by Bifrost so operators
  // can choose between the always-on x-bf-lh- log family and the
  // declared x-bf-dim- telemetry family.
  identity_injection?: CatalogIdentityInjection;
  models: CatalogModel[];
};

export type CatalogIdentityInjection = {
  header_pair?: CatalogHeaderPairInjection;
  json_metadata?: CatalogJSONMetadataInjection;
};

export type CatalogHeaderPairInjection = {
  customizable: boolean;
  end_user_id_header: string;
  tags_header: string;
};

export type CatalogJSONMetadataInjection = {
  // customizable=true → operator can rename the JSON keys per
  // provider record (Cloudflare). false → keys are catalog-fixed
  // (Portkey reserves _user / groups). The wire header itself
  // (e.g. cf-aig-metadata) is always catalog-owned regardless.
  customizable: boolean;
  header: string;
  user_key: string;
  groups_key: string;
};

export type CatalogExtraHeader = {
  // Wire header name the proxy stamps with the operator-typed value.
  // UI copy (label, help text, tooltip) is owned by the dashboard,
  // looked up per-name. See AIProviderModal.tsx → EXTRA_HEADER_UI.
  name: string;
};

export function useProviderCatalog() {
  const { data, isLoading } = useFetchApi<CatalogProvider[]>(
    "/agent-network/catalog/providers",
  );

  const catalog = useMemo<CatalogProvider[]>(() => data ?? [], [data]);
  const byId = useMemo(() => {
    const map = new Map<string, CatalogProvider>();
    catalog.forEach((p) => map.set(p.id, p));
    return map;
  }, [catalog]);

  return {
    catalog,
    isLoading,
    getById: (id: string): CatalogProvider | undefined => byId.get(id),
  } as const;
}
