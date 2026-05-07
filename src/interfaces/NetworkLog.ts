export interface NetworkLogEndpoint {
  id: string;
  type: string;
  name: string;
  address: string;
  dns_label?: string | null;
  os?: string | null;
  geo_location: {
    country_code: string;
    city_name: string;
  };
}

export interface NetworkLogSubEvent {
  timestamp: string;
  type: string;
}

export interface NetworkLogDNS {
  domain?: string | null;
  query?: string | null;
  query_name?: string | null;
  type?: string | null;
  query_type?: string | null;
  record_type?: string | null;
  answers?: string[] | string | null;
  resolved_ips?: string[] | string | null;
  result?: string[] | string | null;
  rcode?: string | null;
}

export interface NetworkLogUser {
  id: string;
  name: string;
  email: string;
}

export interface NetworkLog {
  flow_id: string;
  direction: string;
  protocol: number;
  reporter_id: string;
  rx_bytes: number;
  rx_packets: number;
  tx_bytes: number;
  tx_packets: number;
  dns?: NetworkLogDNS | null;
  dns_domain?: string | null;
  dns_query?: string | null;
  dns_query_name?: string | null;
  dns_type?: string | null;
  dns_query_type?: string | null;
  dns_record_type?: string | null;
  dns_answers?: string[] | string | null;
  dns_resolved_ips?: string[] | string | null;
  dns_result?: string[] | string | null;
  source_port?: number | null;
  destination_port?: number | null;
  dest_port?: number | null;
  source: NetworkLogEndpoint;
  destination: NetworkLogEndpoint;
  policy: {
    id: string;
    name: string;
  };
  icmp: {
    type: number;
    code: number;
  };
  user: NetworkLogUser;
  events: NetworkLogSubEvent[];
}
