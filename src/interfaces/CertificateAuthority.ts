export interface CACertificate {
  id: string;
  fingerprint: string;
  display_name?: string;
  organization?: string;
  is_active: boolean;
  not_before: string;
  not_after: string;
  created_at: string;
  certificate_pem?: string;
}

export interface IssuedCertificate {
  id: string;
  peer_id: string;
  serial_number: string;
  dns_names: string[];
  has_wildcard: boolean;
  signing_type: string;
  not_before: string;
  not_after: string;
  created_at: string;
  revoked: boolean;
}
