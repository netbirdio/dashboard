export interface Route {
  id?: string | null;
  description: string;
  enabled: boolean;
  peer?: string;
  network: string;
  network_id: string;
  network_type?: string;
  metric?: number;
  masquerade: boolean;
  groups: string[];
  peer_groups?: string[];
  routesGroups?: string[];
  groupedRoutes?: GroupedRoute[];
}

export interface GroupedRoute {
  id: string;
  enabled: boolean;
  network: string;
  network_id: string;
  high_availability_count: number;
  is_using_route_groups: boolean;
  routes?: Route[];
  description?: string;
}
