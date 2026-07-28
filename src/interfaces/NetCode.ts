export interface NetCodeResourceRef {
  type: string;
  address: string;
}

export interface NetCodeGroup {
  id: string;
  name: string;
  issued?: string;
  peers?: string[] | null;
  resources?: NetCodeResourceRef[] | null;
}

export interface NetCodePolicyRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  action: string;
  protocol: string;
  ports?: string[];
  sources?: string[];
  destinations?: string[];
  sourceResource?: NetCodeResourceRef;
  destinationResource?: NetCodeResourceRef;
  bidirectional: boolean;
  authorizedGroups?: Record<string, string[]>;
}

export interface NetCodePolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: NetCodePolicyRule[];
  sourcePostureChecks?: string[];
}

export interface NetCodeNetwork {
  id: string;
  name: string;
  description?: string;
}

export interface NetCodeNetworkResource {
  id: string;
  networkId: string;
  name: string;
  description?: string;
  type?: string;
  address: string;
  groups?: string[] | null;
  enabled: boolean;
}

export interface NetCodeNetworkRouter {
  id: string;
  networkId: string;
  peer?: string;
  peerGroups?: string[] | null;
  metric: number;
  masquerade: boolean;
  enabled: boolean;
}

export interface NetCodeSpecPeer {
  id: string;
  name: string;
  hostname?: string;
  ip?: string;
  dnsLabel?: string;
  userId?: string;
  location?: { countryCode?: string; cityName?: string } | null;
}

export interface NetCodeAccountSpec {
  peers?: NetCodeSpecPeer[] | null;
  groups?: NetCodeGroup[] | null;
  policies?: NetCodePolicy[] | null;
  networks?: NetCodeNetwork[] | null;
  networkResources?: NetCodeNetworkResource[] | null;
  networkRouters?: NetCodeNetworkRouter[] | null;
  [key: string]: unknown;
}

export interface NetCodeValidationError {
  path: string;
  message: string;
  severity: string;
}

export interface NetCodeValidationResult {
  valid: boolean;
  errors: NetCodeValidationError[] | null;
  warnings: NetCodeValidationError[] | null;
}

export interface NetCodeOperation {
  type: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  path?: string;
  data?: unknown;
  old_value?: unknown;
  new_value?: unknown;
}

export interface NetCodeChangeset {
  id: string;
  account_id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  validation_status: string;
  validation_errors: NetCodeValidationError[] | null;
  diff_data: string;
  operations: NetCodeOperation[] | null;
  yaml_source: string;
  metadata?: Record<string, string> | null;
}

export interface NetCodeDiffSummary {
  added: Record<string, number> | null;
  modified: Record<string, number> | null;
  deleted: Record<string, number> | null;
}

export interface NetCodeImportResult {
  changesetId: string;
  status: string;
  validation: NetCodeValidationResult;
  summary: NetCodeDiffSummary;
}

export interface NetCodeCommitAuthor {
  user_id: string;
  name: string;
  email: string;
}

export interface NetCodeCommitStats {
  insertions: number;
  deletions: number;
  files_changed: number;
}

export interface NetCodeCommit {
  id: string;
  account_id?: string;
  parent_id?: string;
  object_id?: string;
  message: string;
  description?: string;
  author?: NetCodeCommitAuthor;
  timestamp: string;
  stats?: NetCodeCommitStats;
  tags?: string[] | null;
  operations?: NetCodeOperation[] | null;
  diff_data?: string;
}

export interface NetCodeDiffReference {
  type: string;
  id: string;
  timestamp: string;
}

export interface NetCodeDiffResult {
  from: NetCodeDiffReference;
  to: NetCodeDiffReference;
  diff: string;
  summary: NetCodeDiffSummary;
}

export interface NetCodePagination {
  total: number;
  limit: number;
  offset: number;
}

export interface NetCodeChangesetListResponse {
  changesets: NetCodeChangeset[] | null;
  pagination?: NetCodePagination;
}

export interface NetCodeCommitListResponse {
  commits: NetCodeCommit[] | null;
  pagination?: NetCodePagination;
}

export interface NetCodeStatus {
  accountId: string;
  latestCommit: NetCodeCommit | null;
  pendingChangesets: number;
  uncommittedChanges: boolean;
  lastExportedAt: string;
}
