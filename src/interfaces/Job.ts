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
  bundle_for: boolean;
  bundle_for_time: number;
  log_file_count: number;
}
