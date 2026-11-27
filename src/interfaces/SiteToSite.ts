/**
 * Two networks joined by policies that let a resource in one reach a
 * resource in the other. The first network is the source network of the
 * connection's first policy.
 */
export interface SiteToSiteConnection {
  network_ids: string[];
  policy_ids: string[];
  enabled: boolean;
}
