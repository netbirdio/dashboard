
export interface Route {
  id?: string | null;
  description: string;
  enabled: boolean;
  peer: string;
  network: string;
  network_id: string;
  network_type?: string;
  metric?: number;
  masquerade: boolean;
  groups: string[];
  peer_groups?: string[];
  routesGroups?: string[];
  groupedRoutes?: Array<any>;
}

export interface RouteToSave extends Route
{
    groupsToCreate: string[]
}