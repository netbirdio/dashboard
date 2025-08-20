export interface Route {
  id?: string | null;
  description: string;
  enabled: boolean;
  peer?: string;
  network?: string;
  domains?: string[];
  network_id: string;
  network_type?: string;
  metric?: number;
  masquerade: boolean;
  groups: string[];
  keep_route?: boolean;
  access_control_groups?: string[];
  skip_auto_apply?: boolean;
  // Frontend only
  peer_groups?: string[];
  routesGroups?: string[];
  groupedRoutes?: GroupedRoute[];
  group_names?: string[];
  domain_search?: string;
}

export interface GroupedRoute {
  id: string;
  enabled: boolean;
  network?: string;
  domains?: string[];
  keep_route?: boolean;
  access_control_groups?: string[];
  network_id: string;
  high_availability_count: number;
  is_using_route_groups: boolean;
  routes?: Route[];
  group_names?: string[];
  description?: string;
  description_search?: string;
  domain_search?: string;
  routes_search?: string;
}
