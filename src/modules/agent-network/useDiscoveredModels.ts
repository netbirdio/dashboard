"use client";

import { useApiCall } from "@utils/api";
import { useCallback, useState } from "react";

// DiscoveredModel is one model the vendor says this credential can reach.
export type DiscoveredModel = {
  // The id to register, in the form the vendor issues it. For Bedrock that is
  // the region-prefixed inference-profile id, which is the only form AWS
  // accepts at invoke time — so it must be stored verbatim, not tidied up.
  id: string;
  label?: string;
  // false when NetBird's shipped pricing table has no rate for this model. The
  // operator has to supply one, or requests to it record a cost of zero.
  pricing_known: boolean;
};

type DiscoveryResponse = { models: DiscoveredModel[] };

type DiscoveryRequest = {
  catalog_provider_id: string;
  upstream_url?: string;
  // Exactly one of these. api_key is for a provider being typed in and not yet
  // saved; provider_id reuses a saved record's stored credential, which is how
  // an existing provider refreshes its list without the browser ever holding
  // the key. Sending both is refused by the API.
  api_key?: string;
  provider_id?: string;
};

// notSupported marks the outcome where the provider simply has no listing
// endpoint — most gateways. It is not an error the operator should see as one:
// the form falls back to the catalog's own models.
export type DiscoveryState = {
  models: DiscoveredModel[];
  isLoading: boolean;
  notSupported: boolean;
  error?: string;
};

/**
 * useDiscoveredModels asks the vendor which models a credential can actually
 * reach, so the model picker can offer the operator's real entitlements
 * instead of only NetBird's compiled-in catalog.
 *
 * The catalog cannot know which OpenAI models an org is entitled to, which
 * Bedrock profiles an account and region hold, or which Vertex models a
 * project has enabled — and it drifts as vendors retire models.
 */
export function useDiscoveredModels() {
  // ignoreError: the failures here are expected and handled inline (a wrong
  // key, a provider with no listing endpoint), so they must not raise the
  // global error toast on top of the message shown in the form.
  const request = useApiCall<DiscoveryResponse>(
    "/agent-network/catalog/providers/models",
    true,
  );

  const [state, setState] = useState<DiscoveryState>({
    models: [],
    isLoading: false,
    notSupported: false,
  });

  const discover = useCallback(
    async (req: DiscoveryRequest) => {
      setState({ models: [], isLoading: true, notSupported: false });
      try {
        const res = await request.post(req);
        setState({
          models: res?.models ?? [],
          isLoading: false,
          notSupported: false,
        });
        return res?.models ?? [];
      } catch (e) {
        // 422 is the API saying this provider has no listing endpoint, which
        // is a fact about the catalog entry rather than a failure — the caller
        // keeps the catalog list and says so quietly.
        const status = (e as { status?: number })?.status;
        setState({
          models: [],
          isLoading: false,
          notSupported: status === 422,
          error:
            status === 422
              ? undefined
              : (e as { message?: string })?.message ??
                "Could not reach the provider",
        });
        return [];
      }
    },
    [request],
  );

  const reset = useCallback(
    () => setState({ models: [], isLoading: false, notSupported: false }),
    [],
  );

  return { ...state, discover, reset } as const;
}
