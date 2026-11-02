export interface Job {
  id: string;
  triggered_by: string;
  completed_at: Date | null;
  created_at: Date;
  failed_reason: string | null;
  workload: Workload;
  status: "pending" | "succeeded" | "failed";
}

export interface Workload {
  type: "bundle";
  parameters: BundleJobParameters;
  result: string | null;
}

// Parameters for bundle job
export interface BundleJobParameters {
  anonymize: boolean;
  // Anonymization level applied when anonymize is enabled. "default" keeps
  // internal IP ranges readable; "strict" also anonymizes them. Omitted or
  // empty resolves to the default on the peer.
  anonymize_level?: "default" | "strict";
  bundle_for: boolean;
  bundle_for_time: number;
  log_file_count: number;
  // Upload service URL the peer requests an upload URL from. Empty selects the
  // default upload server.
  upload_url?: string;
}
